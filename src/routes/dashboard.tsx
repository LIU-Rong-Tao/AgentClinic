import { appointmentState } from '../appointments.js';
import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import {
  Dashboard,
  StatusConfirmation,
  type DashboardAppointment,
} from '../components/Dashboard.js';
function validId(raw: string) {
  return /^[1-9]\d*$/.test(raw) && Number.isSafeInteger(Number(raw));
}
export function dashboardRouter(
  db: Database.Database,
  now: () => number = Date.now,
) {
  const router = new Hono();
  const select = `SELECT p.id,p.agent_id,a.name AS agent_name,t.name AS therapy_name,p.therapist_id,p.starts_at,p.status FROM appointments p JOIN agents a ON a.id=p.agent_id JOIN therapies t ON t.id=p.therapy_id`;
  const one = db.prepare<[number], DashboardAppointment>(
    select + ' WHERE p.id=?',
  );
  const all = db.prepare<[], DashboardAppointment>(
    select + ' ORDER BY p.starts_at,p.id',
  );
  const scheduled = db.prepare<[number], DashboardAppointment>(
    select +
      " WHERE p.status='scheduled' AND p.starts_at + 1800 > ? ORDER BY p.starts_at,p.id",
  );
  const stats = db.prepare<
    [number],
    { agents: number; ailments: number; scheduled: number }
  >(
    "SELECT (SELECT COUNT(*) FROM agents) AS agents,(SELECT COUNT(*) FROM ailments) AS ailments,(SELECT COUNT(*) FROM appointments WHERE status='scheduled' AND starts_at + 1800 > ?) AS scheduled",
  );
  const update = db.prepare(
    "UPDATE appointments SET status='cancelled' WHERE id=? AND status='scheduled' AND starts_at > ?",
  );
  router.get('/', (c) => {
    const view = c.req.query('view') ?? 'scheduled';
    if (view !== 'all' && view !== 'scheduled')
      return c.text('无效的预约筛选', 400);
    const current = now();
    const id = c.req.query('updated') ?? '';
    return c.html(
      <Dashboard
        stats={stats.get(current / 1000)!}
        appointments={
          view === 'all' ? all.all() : scheduled.all(current / 1000)
        }
        view={view}
        nowMs={current}
        updated={validId(id) ? one.get(Number(id)) : undefined}
      />,
    );
  });
  router.get('/appointments/:id/status', (c) => {
    const raw = c.req.param('id');
    const a = validId(raw) ? one.get(Number(raw)) : undefined;
    if (!a) return c.notFound();
    const target = c.req.query('target'),
      view = c.req.query('view') ?? 'scheduled';
    if (target !== 'cancelled' || (view !== 'all' && view !== 'scheduled'))
      return c.text('无效的状态操作', 400);
    const current = now();
    const canCancel =
      appointmentState(a.status, a.starts_at, current) === 'scheduled';
    return c.html(
      <StatusConfirmation
        appointment={a}
        target={target}
        view={view}
        conflict={!canCancel}
        nowMs={current}
      />,
      canCancel ? 200 : 409,
    );
  });
  router.post('/appointments/:id/status', async (c) => {
    const raw = c.req.param('id');
    if (!validId(raw)) return c.notFound();
    const body = await c.req.parseBody({ all: true });
    const target = body.target,
      view = body.view ?? 'scheduled';
    if (target !== 'cancelled' || (view !== 'all' && view !== 'scheduled'))
      return c.text('无效的状态操作', 400);
    // 条件更新在单条 SQL 中完成，旧页面和并发请求不能覆盖已结束状态。
    const result = db
      .transaction(() => update.run(Number(raw), now() / 1000))
      .immediate();
    if (result.changes === 0) {
      const a = one.get(Number(raw));
      if (!a) return c.notFound();
      return c.html(
        <StatusConfirmation
          appointment={a}
          target={target}
          view={view}
          conflict
          nowMs={now()}
        />,
        409,
      );
    }
    return c.redirect(`/dashboard?view=${view}&updated=${raw}`, 303);
  });
  return router;
}
