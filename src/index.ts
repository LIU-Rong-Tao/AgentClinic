import { serve } from '@hono/node-server';
import { app } from './app.js';

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT 必须是 1 到 65535 之间的整数');
}
const server = serve(
  { fetch: app.fetch, hostname: '127.0.0.1', port },
  (info) => {
    console.log(`AgentClinic: http://127.0.0.1:${info.port}`);
  },
);
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close((error) => {
      process.exit(error ? 1 : 0);
    });
  });
}
