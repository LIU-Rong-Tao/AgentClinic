import { Reviews } from './pages/Reviews.js';
import { customerReviews } from './data/reviews.js';
import { feedbackRouter } from './routes/feedback.js';
import { ErrorPage } from './pages/ErrorPage.js';
import {
  requestLogger,
  consoleLog,
  type LogSink,
} from './middleware/logger.js';
import { dashboardRouter } from './routes/dashboard.js';
import { appointmentsRouter } from './routes/appointments.js';
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { fileURLToPath } from 'node:url';
import { Home } from './pages/Home.js';
import type Database from 'better-sqlite3';
import { agentsRouter } from './routes/agents.js';
import { ailmentsRouter } from './routes/ailments.js';
import { therapiesRouter } from './routes/therapies.js';

export function createApp(
  db: Database.Database,
  now: () => number = Date.now,
  log: LogSink = consoleLog,
) {
  const app = new Hono();
  app.use('*', requestLogger(log));
  app.notFound((c) => c.html(<ErrorPage status={404} />, 404));
  app.onError((_error, c) => c.html(<ErrorPage status={500} />, 500));
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
  app.get('/reviews', (c) => c.html(<Reviews reviews={customerReviews} />));
  app.route('/agents', agentsRouter(db));
  app.route('/agents', appointmentsRouter(db, now));
  app.route('/ailments', ailmentsRouter(db));
  app.route('/therapies', therapiesRouter(db));
  app.route('/dashboard', dashboardRouter(db, now));
  app.route('/feedback', feedbackRouter(db));
  return app;
}
