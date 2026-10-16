import { beforeEach, afterEach, expect, it } from 'vitest';
import { createDb } from '../src/db/index.js';
import { migrate } from '../src/db/migrate.js';
import { seed } from '../src/db/seed.js';
import { createApp } from '../src/app.js';
import { parseShanghaiSlot } from '../src/appointments.js';
let db: ReturnType<typeof createDb>;
let app: ReturnType<typeof createApp>;
const now = Date.parse('2030-01-01T00:00:00+08:00');
beforeEach(() => {
  db = createDb(':memory:');
  migrate(db);
  seed(db);
  app = createApp(db, () => now);
});
afterEach(() => db.close());
const defaults = {
  therapy_id: '1',
  therapist_id: 'ada',
  date: '2030-01-02',
  time: '10:00',
};
function post(values: Partial<typeof defaults> = {}, agent = 1) {
  return app.request(`/agents/${agent}/appointments`, {
    method: 'POST',
    body: new URLSearchParams({ ...defaults, ...values }),
  });
}
function count() {
  return (
    db.prepare('SELECT count(*) AS n FROM appointments').get() as { n: number }
  ).n;
}
it('表单只列匹配疗法，成功后 303 到所属确认页，UTC 时间准确且原五表不变', async () => {
  const snapshot = () =>
    [
      'agents',
      'ailments',
      'agent_ailments',
      'therapies',
      'ailment_therapies',
    ].map((t) => db.prepare(`SELECT * FROM ${t}`).all());
  const before = snapshot();
  const form = await (await app.request('/agents/1/appointments/new')).text();
  expect(form).toContain('Prompt Reduction Therapy');
  expect(form).not.toContain('Cognitive Grounding Sessions');
  expect(await (await app.request('/agents/1')).text()).toContain(
    '/agents/1/appointments/new',
  );
  const r = await post();
  expect(r.status).toBe(303);
  expect(r.headers.get('location')).toBe('/agents/1/appointments/1');
  expect(
    db
      .prepare(
        'SELECT agent_id,therapy_id,therapist_id,starts_at,status FROM appointments',
      )
      .get(),
  ).toEqual({
    agent_id: 1,
    therapy_id: 1,
    therapist_id: 'ada',
    starts_at: Date.parse('2030-01-02T02:00:00Z') / 1000,
    status: 'scheduled',
  });
  const html = await (await app.request(r.headers.get('location')!)).text();
  expect(html).toContain('2030-01-02 10:00');
  expect(html).toContain('Dr. Ada');
  expect(html).toContain('状态：待开始');
  expect(snapshot()).toEqual(before);
  expect((await app.request('/agents/2/appointments/1')).status).toBe(404);
});
it('严格校验日期、未来时间、半小时、推荐和治疗师，失败不写入', async () => {
  for (const invalid of [
    { date: '2030-02-30' },
    { date: '2029-01-01' },
    { date: '2030-01-01', time: '00:00' },
    { time: '10:15' },
    { time: '24:00' },
    { time: '10:00:00' },
    { therapy_id: '3' },
    { therapy_id: '01' },
    { therapist_id: 'evil' },
    { date: '' },
  ]) {
    expect((await post(invalid)).status).toBe(400);
    expect(count()).toBe(0);
  }
  expect(parseShanghaiSlot('2032-02-29', '10:30')).toBeDefined();
  expect(parseShanghaiSlot('2030-02-29', '10:30')).toBeUndefined();
  const response = await post({ date: '2030-02-30' });
  const html = await response.text();
  expect(html).toContain('role="alert"');
  expect(html).toContain('value="2030-02-30"');
});
it('重复、同 Agent 和同治疗师冲突拒绝；相邻时段与不同资源允许', async () => {
  expect((await post()).status).toBe(303);
  expect((await post()).status).toBe(409);
  expect((await post({ therapist_id: 'turing' })).status).toBe(409);
  expect((await post({ therapy_id: '3' }, 2)).status).toBe(409);
  expect(
    (await post({ therapy_id: '3', therapist_id: 'turing' }, 2)).status,
  ).toBe(303);
  expect((await post({ time: '10:30' })).status).toBe(303);
  expect(count()).toBe(3);
});
it('并发提交冲突请求仅一个成功', async () => {
  const results = await Promise.all([post(), post()]);
  expect(results.map((r) => r.status).sort()).toEqual([303, 409]);
  expect(count()).toBe(1);
});
it('数据库唯一约束阻止绕过路由重复占位，取消释放时段', async () => {
  await post();
  const insert = db.prepare(
    'INSERT INTO appointments(agent_id,therapy_id,therapist_id,starts_at) SELECT ?,?,?,starts_at FROM appointments WHERE id=1',
  );
  expect(() => insert.run(1, 1, 'turing')).toThrow();
  expect(() => insert.run(2, 3, 'ada')).toThrow();
  db.exec("UPDATE appointments SET status='cancelled' WHERE id=1");
  expect((await post()).status).toBe(303);
  expect(count()).toBe(2);
});
it('无推荐不可预约；非法路径和不属于 Agent 的记录为 404', async () => {
  db.exec('DELETE FROM agent_ailments WHERE agent_id=1');
  const html = await (await app.request('/agents/1/appointments/new')).text();
  expect(html).toContain('暂时无法预约');
  expect(html).not.toContain('<form');
  expect((await post()).status).toBe(400);
  for (const path of [
    '/agents/01/appointments/new',
    '/agents/999/appointments/new',
    '/agents/1/appointments/999',
  ])
    expect((await app.request(path)).status).toBe(404);
});
it('确认页转义数据，重复字段不能绕过校验', async () => {
  db.prepare('UPDATE agents SET name=? WHERE id=1').run(
    '<script>alert(1)</script>',
  );
  await post();
  const html = await (await app.request('/agents/1/appointments/1')).text();
  expect(html).toContain('&lt;script&gt;');
  expect(html).not.toContain('<script>');
  const body = new URLSearchParams({ ...defaults, time: '11:00' });
  body.append('therapist_id', 'turing');
  expect(
    (await app.request('/agents/1/appointments', { method: 'POST', body }))
      .status,
  ).toBe(400);
  expect(count()).toBe(1);
});
