# Image fournie : elle exécute les commandes imposées par le cahier des charges (section 2).
FROM oven/bun:1.4.3

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY . .

ENV PORT=3000
EXPOSE 3000

# le stockage est initialisé avant chaque démarrage : la commande doit être idempotente
CMD ["sh", "-c", "bun run db:migrate && bun run start"]

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
