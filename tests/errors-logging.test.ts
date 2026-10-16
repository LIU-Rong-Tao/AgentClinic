import { beforeEach, afterEach, it, expect } from 'vitest';
import { createApp } from '../src/app.js';
import { createDb } from '../src/db/index.js';
import { migrate } from '../src/db/migrate.js';
import { seed } from '../src/db/seed.js';
import type { RequestLog } from '../src/middleware/logger.js';
let db: ReturnType<typeof createDb>;
let app: ReturnType<typeof createApp>;
let logs: RequestLog[];
beforeEach(() => {
  db = createDb(':memory:');
  migrate(db);
  seed(db);
  logs = [];
  app = createApp(
    db,
    () => Date.parse('2030-01-01'),
    (e) => logs.push(e),
  );
});
afterEach(() => db.close());
it('未知页面和不存在记录使用明确 404，提供返回入口', async () => {
  for (const path of [
    '/unknown',
    '/agents/999',
    '/dashboard/appointments/999/status?target=completed',
  ]) {
    const r = await app.request(path);
    expect(r.status).toBe(404);
    expect(r.headers.get('content-type')).toContain('text/html');
    const html = await r.text();
    expect(html).toContain('404 · 页面或记录不存在');
    expect(html).toContain('返回首页');
    expect(html).not.toContain('AgentClinic is open for business');
  }
  expect(logs.map((l) => l.status)).toEqual([404, 404, 404]);
});
it('同步、异步、POST 故障统一 500，不泄漏异常或误导重试', async () => {
  app.get('/sync-error', () => {
    throw Error('SECRET_SQL SELECT token');
  });
  app.get('/async-error', async () => {
    await Promise.resolve();
    throw Error('SECRET_STACK');
  });
  let attempts = 0;
  app.post('/write-error', () => {
    attempts++;
    throw Error('SECRET_WRITE');
  });
  for (const [path, method] of [
    ['/sync-error', 'GET'],
    ['/async-error', 'GET'],
    ['/write-error', 'POST'],
  ]) {
    const r = await app.request(path, { method });
    expect(r.status).toBe(500);
    expect(r.headers.get('content-type')).toContain('text/html');
    const html = await r.text();
    expect(html).toContain('500 · 请求暂时无法处理');
    expect(html).toContain('先查看预约记录');
    expect(html).not.toMatch(
      /SECRET|<form|http-equiv|AgentClinic is open for business/,
    );
  }
  expect(attempts).toBe(1);
  expect(logs.map((l) => l.status)).toEqual([500, 500, 500]);
  expect(JSON.stringify(logs)).not.toContain('SECRET');
});
it('日志覆盖成功重定向与业务拒绝，只记录四字段，不含查询表单请求头', async () => {
  await app.request('/?secret=query-secret', {
    headers: { Authorization: 'header-secret' },
  });
  const payload = new URLSearchParams({
    therapy_id: '1',
    therapist_id: 'ada',
    date: '2031-01-02',
    time: '10:00',
    secret: 'body-secret',
  });
  await app.request('/agents/1/appointments?secret=query-secret', {
    method: 'POST',
    body: payload,
  });
  await app.request('/agents/1/appointments', {
    method: 'POST',
    body: payload,
  });
  await app.request('/agents/1/appointments', {
    method: 'POST',
    body: new URLSearchParams({
      ...Object.fromEntries(payload),
      therapist_id: 'invalid',
    }),
  });
  expect(logs.map((l) => l.status)).toEqual([200, 303, 409, 400]);
  for (const l of logs) {
    expect(Object.keys(l).sort()).toEqual([
      'durationMs',
      'method',
      'path',
      'status',
    ]);
    expect(l.durationMs).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(l.durationMs)).toBe(true);
    expect(l.path).not.toContain('?');
  }
  expect(logs[1].method).toBe('POST');
  expect(logs[1].path).toBe('/agents/1/appointments');
  expect(JSON.stringify(logs)).not.toMatch(
    /query-secret|body-secret|header-secret/,
  );
});
