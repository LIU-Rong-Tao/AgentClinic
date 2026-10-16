import { beforeEach, afterEach, it, expect } from 'vitest';
import { createDb } from '../src/db/index.js';
import { migrate } from '../src/db/migrate.js';
import { seed } from '../src/db/seed.js';
import { createApp } from '../src/app.js';
let db: ReturnType<typeof createDb>;
let app: ReturnType<typeof createApp>;
beforeEach(() => {
  db = createDb(':memory:');
  migrate(db);
  seed(db);
  app = createApp(db, () => Date.parse('2030-01-01T00:00:00Z'));
});
afterEach(() => db.close());
function add(
  status = 'scheduled',
  slot = Date.parse('2031-01-02T02:00:00Z') / 1000,
) {
  return Number(
    db
      .prepare(
        "INSERT INTO appointments(agent_id,therapy_id,therapist_id,starts_at,status) VALUES(1,1,'ada',?,?)",
      )
      .run(slot, status).lastInsertRowid,
  );
}
function update(id: number, target: string, view = 'scheduled') {
  return app.request(`/dashboard/appointments/${id}/status`, {
    method: 'POST',
    body: new URLSearchParams({ target, view }),
  });
}
function snapshot() {
  return [
    'agents',
    'ailments',
    'agent_ailments',
    'therapies',
    'ailment_therapies',
  ].map((t) => db.prepare(`SELECT * FROM ${t}`).all());
}
function rows() {
  return db.prepare('SELECT * FROM appointments ORDER BY id').all();
}
it('三项统计独立于筛选，默认仅已安排，全部包含终态且按时间排序', async () => {
  const later = add('scheduled', 1925087400),
    earlier = add('scheduled', 1925085600);
  const done = add('completed', 1925083800);
  add('cancelled', 1925082000);
  const before = rows();
  let html = await (await app.request('/dashboard')).text();
  expect(html).toContain('Agent 总数：6');
  expect(html).toContain('病症种类数：6');
  expect(html).toContain('有效预约数：2');
  expect(html).toContain(`取消预约 #${earlier}`);
  expect(html).not.toContain(`/appointments/${done}`);
  expect(html.indexOf(`取消预约 #${earlier}`)).toBeLessThan(
    html.indexOf(`取消预约 #${later}`),
  );
  html = await (await app.request('/dashboard?view=all')).text();
  expect(html).toContain('有效预约数：2');
  expect(html).toContain('已结束');
  expect(html).toContain('已取消');
  expect(html.match(/<tbody>[\s\S]*<\/tbody>/)![0].match(/<tr>/g)).toHaveLength(
    4,
  );
  expect(rows()).toEqual(before);
});
it('空状态和非法筛选清楚', async () => {
  expect(await (await app.request('/dashboard')).text()).toContain(
    '暂无有效预约',
  );
  expect(await (await app.request('/dashboard?view=all')).text()).toContain(
    '暂无预约记录',
  );
  expect((await app.request('/dashboard?view=bad')).status).toBe(400);
});
it('确认页只读，取消后原筛选保留且统计同步，原五表和预约数量不变', async () => {
  const id = add(),
    before = snapshot(),
    previous = rows();
  const confirm = await app.request(
    `/dashboard/appointments/${id}/status?target=cancelled&view=all`,
  );
  expect(confirm.status).toBe(200);
  const html = await confirm.text();
  for (const text of [
    'Bartholomew-47B',
    'Prompt Reduction Therapy',
    '2031-01-02 10:00',
    '目标状态：已取消',
    '取消后不能恢复',
  ])
    expect(html).toContain(text);
  expect(rows()).toEqual(previous);
  const result = await update(id, 'cancelled', 'all');
  expect(result.status).toBe(303);
  expect(result.headers.get('location')).toBe(
    `/dashboard?view=all&updated=${id}`,
  );
  const dashboard = await (
    await app.request(result.headers.get('location')!)
  ).text();
  expect(dashboard).toContain('有效预约数：0');
  expect(dashboard).toContain(`预约编号 #${id} 当前状态：已取消`);
  expect(dashboard).not.toContain(`取消预约 #${id}`);
  expect(rows()).toHaveLength(1);
  expect(snapshot()).toEqual(before);
});
it('取消释放时段，可通过真实创建路由再次预约', async () => {
  const id = add();
  expect((await update(id, 'cancelled')).status).toBe(303);
  const result = await app.request('/agents/1/appointments', {
    method: 'POST',
    body: new URLSearchParams({
      therapy_id: '1',
      therapist_id: 'ada',
      date: '2031-01-02',
      time: '10:00',
    }),
  });
  expect(result.status).toBe(303);
  expect(rows()).toHaveLength(2);
});
it('重复取消竞争仅一笔成功，旧确认及重复请求不能覆盖终态', async () => {
  const id = add();
  const results = await Promise.all([
    update(id, 'cancelled'),
    update(id, 'cancelled'),
  ]);
  expect(results.map((r) => r.status).sort()).toEqual([303, 409]);
  const before = rows();
  expect((await update(id, 'completed')).status).toBe(400);
  expect((await update(id, 'cancelled')).status).toBe(409);
  const old = await app.request(
    `/dashboard/appointments/${id}/status?target=cancelled`,
  );
  expect(old.status).toBe(409);
  expect(await old.text()).not.toContain('<form');
  expect(rows()).toEqual(before);
});
it('非法目标、重复字段和不存在资源不写入；终态不能恢复', async () => {
  const id = add(),
    before = rows();
  for (const target of ['scheduled', 'completed', 'pending', 'bad', ''])
    expect((await update(id, target)).status).toBe(400);
  expect((await update(999, 'cancelled')).status).toBe(404);
  expect((await update(id, 'completed', 'bad')).status).toBe(400);
  const body = new URLSearchParams({ target: 'completed' });
  body.append('target', 'cancelled');
  expect(
    (
      await app.request(`/dashboard/appointments/${id}/status`, {
        method: 'POST',
        body,
      })
    ).status,
  ).toBe(400);
  expect(rows()).toEqual(before);
});
it('数据库文本在列表及确认页转义，导航提供仪表盘', async () => {
  const id = add();
  db.prepare('UPDATE therapies SET name=? WHERE id=1').run(
    '<script>x</script>',
  );
  for (const route of [
    '/dashboard',
    `/dashboard/appointments/${id}/status?target=cancelled`,
  ]) {
    const html = await (await app.request(route)).text();
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  }
  expect(await (await app.request('/')).text()).toContain(
    '<a href="/dashboard">员工仪表盘</a>',
  );
});

it('开始与结束时间边界：旧确认不能越过开始时间取消，结束自动退出有效列表', async () => {
  const id = add();
  const start = Date.parse('2031-01-02T02:00:00Z');
  let current = start - 1;
  app = createApp(db, () => current);
  expect(
    (await app.request(`/dashboard/appointments/${id}/status?target=cancelled`))
      .status,
  ).toBe(200);
  const before = rows();
  current = start;
  let html = await (await app.request('/dashboard')).text();
  expect(html).toContain('进行中');
  expect(html).toContain('有效预约数：1');
  expect(html).not.toContain(`取消预约 #${id}`);
  expect(html).not.toContain('target=completed');
  expect((await update(id, 'cancelled')).status).toBe(409);
  expect(rows()).toEqual(before);
  current = start + 1800000 - 1;
  expect(await (await app.request('/dashboard')).text()).toContain('进行中');
  current = start + 1800000;
  html = await (await app.request('/dashboard')).text();
  expect(html).toContain('有效预约数：0');
  expect(html).toContain('暂无有效预约');
  expect(await (await app.request('/dashboard?view=all')).text()).toContain(
    '已结束',
  );
  expect(
    await (await app.request(`/agents/1/appointments/${id}`)).text(),
  ).toContain('状态：已结束');
  expect((await update(id, 'cancelled')).status).toBe(409);
  expect(rows()).toEqual(before);
});
it('开始前一毫秒可取消，取消记录不会随时间重新激活', async () => {
  const id = add();
  let current = Date.parse('2031-01-02T02:00:00Z') - 1;
  app = createApp(db, () => current);
  expect((await update(id, 'cancelled')).status).toBe(303);
  current += 3600001;
  expect(await (await app.request('/dashboard?view=all')).text()).toContain(
    '已取消',
  );
});
