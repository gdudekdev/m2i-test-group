import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { errorBody, toHttpError } from "./toHttpError";

export type ModuleRoutes = Record<string, Hono>;

export type AppOptions = { publicDir?: string };

// `createApp` monte les routes déjà construites de chaque module. Cette fonction
// ne connaît ni TypeORM ni la manière dont les dépendances ont été assemblées.
export function createApp(modules: ModuleRoutes, { publicDir }: AppOptions = {}) {
  const app = new Hono();

  // Le harnais E2E utilise cette route pour observer la disponibilité réelle.
  app.get("/health", (context) => context.json({ status: "ok" }));

  for (const [path, routes] of Object.entries(modules)) {
    app.route(path, routes);
  }

  if (publicDir) {
    app.use("/*", serveStatic({ root: publicDir }));
  }

  app.notFound((context) =>
    context.json(errorBody("NOT_FOUND", "Route not found"), 404),
  );
  app.onError((error, context) => {
    const response = toHttpError(error);
    if (response.status === 500) {
      console.error(error);
    }
    return context.json(response.body, response.status);
  });

  return app;
}
