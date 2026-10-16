import { buildApp } from './app.js';

const PORT = Number(process.env.PORT) || 8080;
const HOST = '0.0.0.0';

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`[MacroMetrics API] Executando em http://${HOST}:${PORT} (GCP us-central1)`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
