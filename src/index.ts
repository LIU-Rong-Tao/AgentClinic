import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { createDb } from './db/index.js';
import { migrate } from './db/migrate.js';

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT 必须是 1 到 65535 之间的整数');
}

const db = createDb(process.env.DATABASE_PATH);
try {
  const applied = migrate(db);
  console.log(`数据库：${db.name}（本次应用 ${applied.length} 项迁移）`);
} catch (error) {
  db.close();
  throw new Error('数据库初始化失败，HTTP 服务未启动', { cause: error });
}
process.once('exit', () => {
  if (db.open) db.close();
});

const app = createApp(db);
const server = serve(
  { fetch: app.fetch, hostname: '127.0.0.1', port },
  (info) => {
    console.log(`AgentClinic: http://127.0.0.1:${info.port}`);
  },
);
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close((error) => {
      db.close();
      process.exit(error ? 1 : 0);
    });
  });
}
