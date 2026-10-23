import type { DataSource } from "typeorm";
import { createDataSource } from "../../../../shared/adapters/persistence/data-source";
import { createApp } from "../../../../shared/http/app";
import { ShootoutEvents } from "../../../../sse/ShootoutEvents";
import type { ShootoutView } from "../../application/queries/ShootoutView";
import { createShootoutModule, shootoutEntities } from "../../shootout.module";

export const NOW = new Date("2026-10-17T12:00:00.000Z");

export type ApiResponse<T = any> = { status: number; location: string | null; body: T };

export type SseEvent = { event: string; id: string; data: ShootoutView };

const openApis: TestApi[] = [];

export async function givenApi(): Promise<TestApi> {
    const api = await TestApi.start();
    openApis.push(api);
    return api;
}

export async function closeApis(): Promise<void> {
    await Promise.all(openApis.splice(0).map((api) => api.close()));
}

export const aShootoutBody = (overrides: Record<string, unknown> = {}) =>
    ({ homeTeam: "France", awayTeam: "Italie", startingTeam: "HOME", ...overrides });

export const aShotBody = (expectedVersion: number, overrides: Record<string, unknown> = {}) =>
    ({ team: "HOME", shooter: "Griezmann", goalkeeper: "Donnarumma", outcome: "GOAL", clientShotId: "client-shot-001", expectedVersion, ...overrides });

export class TestApi {
    private readonly readers: ReadableStreamDefaultReader<Uint8Array>[] = [];

    private constructor(
        readonly dataSource: DataSource,
        private readonly app: ReturnType<typeof createApp>,
    ) { }

    static async start(): Promise<TestApi> {
        const dataSource = createDataSource({ database: ":memory:", entities: [...shootoutEntities] });
        await dataSource.initialize();
        await dataSource.runMigrations();
        let nextId = 0;
        const app = createApp({
            "/shootouts": createShootoutModule({
                dataSource,
                sse: new ShootoutEvents({ heartbeatMs: 50 }),
                clock: () => NOW,
                newId: () => `shootout-${++nextId}`,
            }),
        });
        return new TestApi(dataSource, app);
    }

    async request<T = any>(method: "GET" | "POST", path: string, body?: unknown): Promise<ApiResponse<T>> {
        const response = await this.app.request(path, {
            method,
            headers: body === undefined ? undefined : { "content-type": "application/json" },
            body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
        });
        return { status: response.status, location: response.headers.get("location"), body: await response.json() };
    }

    createShootout(overrides: Record<string, unknown> = {}): Promise<ApiResponse<ShootoutView>> {
        return this.request("POST", "/shootouts", aShootoutBody(overrides));
    }

    recordShot(id: string, expectedVersion: number, overrides: Record<string, unknown> = {}): Promise<ApiResponse<ShootoutView>> {
        return this.request("POST", `/shootouts/${id}/shots`, aShotBody(expectedVersion, overrides));
    }

    async play(id: string, outcomes: readonly string[]): Promise<ShootoutView> {
        let current = (await this.request<ShootoutView>("GET", `/shootouts/${id}`)).body;
        for (const outcome of outcomes) {
            const clientShotId = `shot-${current.shots.length + 1}`;
            current = (await this.recordShot(id, current.version, { team: current.nextTeam, outcome, clientShotId })).body;
        }
        return current;
    }

    async storedShootout(id: string): Promise<{ version: number; status: string; nextTeam: string | null; shots: number } | undefined> {
        const [row] = await this.dataSource.query(
            `SELECT version, status, nextTeam, (SELECT COUNT(*) FROM shots WHERE shootoutId = s.id) AS shots FROM shootouts s WHERE id = ?`,
            [id],
        );
        return row;
    }

    async openEvents(id: string): Promise<{ status: number; contentType: string | null; next: (count: number) => Promise<SseEvent[]> }> {
        const response = await this.app.request(`/shootouts/${id}/events`);
        if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
            return { status: response.status, contentType: response.headers.get("content-type"), next: async () => [] };
        }
        const reader = response.body.getReader();
        this.readers.push(reader);
        return { status: response.status, contentType: response.headers.get("content-type"), next: eventReader(reader) };
    }

    async close(): Promise<void> {
        await Promise.all(this.readers.map((reader) => reader.cancel()));
        if (this.dataSource.isInitialized) await this.dataSource.destroy();
    }
}

function eventReader(reader: ReadableStreamDefaultReader<Uint8Array>) {
    const decoder = new TextDecoder();
    const received: SseEvent[] = [];
    let buffer = "";
    return async (count: number): Promise<SseEvent[]> => {
        while (received.length < count) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let end: number;
            while ((end = buffer.indexOf("\n\n")) !== -1) {
                const block = buffer.slice(0, end);
                buffer = buffer.slice(end + 2);
                if (block.startsWith(":")) continue;
                const fields = Object.fromEntries(block.split("\n").map((line) => [line.slice(0, line.indexOf(": ")), line.slice(line.indexOf(": ") + 2)]));
                received.push({ event: fields.event ?? "", id: fields.id ?? "", data: JSON.parse(fields.data ?? "null") });
            }
        }
        return received.splice(0, count);
    };
}
