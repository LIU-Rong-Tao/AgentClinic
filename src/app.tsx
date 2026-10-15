import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { fileURLToPath } from 'node:url';
import { Layout } from './components/Layout.js';

export const app = new Hono();
// 基于模块位置定位资源，开发源码与构建产物都不依赖启动目录。
app.get(
  '/styles.css',
  serveStatic({
    path: fileURLToPath(new URL('../public/styles.css', import.meta.url)),
  }),
);
app.get('/', (c) => c.html(<Layout />));
