import { beforeEach, afterEach, it, expect } from 'vitest';
import { createDb } from '../src/db/index.js';
import { migrate } from '../src/db/migrate.js';
import { createApp } from '../src/app.js';
let db: ReturnType<typeof createDb>;
beforeEach(() => {
  db = createDb(':memory:');
  migrate(db);
});
afterEach(() => db.close());
it('仪表盘入口、空状态与返回链接', async () => {
  const app = createApp(db);
  expect(await (await app.request('/dashboard')).text()).toContain(
    'href="/dashboard/feedback"',
  );
  const response = await app.request('/dashboard/feedback');
  expect(response.status).toBe(200);
  const html = await response.text();
  expect(html).toContain('暂无反馈记录');
  expect(html).toContain('href="/dashboard"');
});
it('按时间再按编号倒序，完整转义内容和北京时间，读取不修改数据', async () => {
  const insert = db.prepare(
    'INSERT INTO feedback(nickname,message,rating,created_at) VALUES(?,?,?,?)',
  );
  insert.run('较新', '新反馈', 5, '2026-10-16T10:00:00.000Z');
  insert.run('较旧', '旧反馈', 1, '2026-10-15T10:00:00.000Z');
  insert.run(
    '<b>同时间后提交</b>',
    '<script>测试</script>\n' + '长'.repeat(1900),
    3,
    '2026-10-16T10:00:00.000Z',
  );
  const before = db.prepare('SELECT * FROM feedback').all();
  const html = await (
    await createApp(db).request('/dashboard/feedback')
  ).text();
  for (const nickname of ['&lt;b&gt;同时间后提交&lt;/b&gt;', '较新', '较旧']) {
    expect(html).toContain(`<h3>${nickname}</h3>`);
  }
  expect(html.indexOf('&lt;b&gt;同时间后提交')).toBeLessThan(
    html.indexOf('较新'),
  );
  expect(html.indexOf('较新')).toBeLessThan(html.indexOf('较旧'));
  expect(html).toContain('2026/10/16 18:00:00');
  expect(html).toContain('评分：3 / 5');
  expect(html).toContain('长'.repeat(1900));
  expect(html).toContain('&lt;script&gt;测试&lt;/script&gt;');
  expect(html).not.toContain('<script>');
  expect(db.prepare('SELECT * FROM feedback').all()).toEqual(before);
});
it('真实提交后员工列表可查看，访客表单不展示反馈', async () => {
  const app = createApp(db);
  await app.request('/feedback', {
    method: 'POST',
    body: new URLSearchParams({
      nickname: '流程体验者',
      message: '独有反馈内容',
      rating: '4',
    }),
  });
  expect(await (await app.request('/dashboard/feedback')).text()).toContain(
    '独有反馈内容',
  );
  expect(await (await app.request('/feedback')).text()).not.toContain(
    '独有反馈内容',
  );
});
