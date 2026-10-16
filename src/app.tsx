import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { fileURLToPath } from 'node:url';
import { Home } from './pages/Home.js';
import type Database from 'better-sqlite3';
import { agentsRouter } from './routes/agents.js';
import { ailmentsRouter } from './routes/ailments.js';

export function createApp(db: Database.Database) {
  const app = new Hono();
  app.get(
    '/vendor/pico.classless.min.css',
    serveStatic({
      path: fileURLToPath(
        import.meta.resolve('@picocss/pico/css/pico.classless.min.css'),
      ),
    }),
  );
  // 基于模块位置定位资源，开发源码与构建产物都不依赖启动目录。
  app.get(
    '/styles.css',
    serveStatic({
      path: fileURLToPath(new URL('../public/styles.css', import.meta.url)),
    }),
  );
  app.get('/', (c) => c.html(<Home />));
  app.route('/agents', agentsRouter(db));
  app.route('/ailments', ailmentsRouter(db));
  return app;
}
