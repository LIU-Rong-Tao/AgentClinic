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
const valid = { nickname: '体验者', message: '使用建议', rating: '5' };
const count = () => db.prepare('SELECT count(*) AS n FROM feedback').get();
it('主导航连接表单，提供标签与浏览器限制，不显示已有反馈', async () => {
  const app = createApp(db);
  db.prepare('INSERT INTO feedback(nickname,message,rating) VALUES(?,?,?)').run(
    '私密昵称',
    '私密内容',
    3,
  );
  expect(await (await app.request('/')).text()).toContain('href="/feedback"');
  const response = await app.request('/feedback');
  expect(response.status).toBe(200);
  const html = await response.text();
  expect(html).toContain('maxlength="50"');
  expect(html).toContain('maxlength="2000"');
  for (const field of ['nickname', 'message', 'rating'])
    expect(html).toContain(`for="${field}"`);
  expect(html).not.toContain('私密内容');
  expect(html).not.toContain('私密昵称');
});
it('成功 303 跳转，反复访问结果页不写入；显式再次提交是新反馈', async () => {
  const app = createApp(db);
  const post = () =>
    app.request('/feedback', {
      method: 'POST',
      body: new URLSearchParams(valid),
    });
  const response = await post();
  expect(response.status).toBe(303);
  expect(response.headers.get('location')).toBe('/feedback/success');
  for (let i = 0; i < 3; i++)
    expect((await app.request('/feedback/success')).status).toBe(200);
  expect(count()).toEqual({ n: 1 });
  await post();
  expect(count()).toEqual({ n: 2 });
});
it('拒绝重复字段与非法值，回填文本安全转义并保留评分', async () => {
  const app = createApp(db);
  const malicious = '</textarea><script>alert(1)</script>';
  const response = await app.request('/feedback', {
    method: 'POST',
    body: new URLSearchParams({ ...valid, nickname: ' ', message: malicious }),
  });
  expect(response.status).toBe(400);
  const html = await response.text();
  expect(html).toContain('&lt;script&gt;');
  expect(html).not.toContain('<script>');
  expect(html).toMatch(/value="5" selected/);
  expect(html).toContain('role="alert"');
  for (const name of ['nickname', 'message', 'rating']) {
    const body = new URLSearchParams(valid);
    body.append(name, '2');
    expect(
      (await app.request('/feedback', { method: 'POST', body })).status,
    ).toBe(400);
  }
  for (const fields of [
    { nickname: '字'.repeat(51) },
    { message: '字'.repeat(2001) },
    { rating: '1.5' },
    { message: '　' },
  ])
    expect(
      (
        await app.request('/feedback', {
          method: 'POST',
          body: new URLSearchParams({ ...valid, ...fields }),
        })
      ).status,
    ).toBe(400);
  expect(count()).toEqual({ n: 0 });
});
it('保存失败返回统一 500，日志不含反馈内容', async () => {
  const logs: unknown[] = [];
  const app = createApp(db, Date.now, (entry) => logs.push(entry));
  db.exec(
    "CREATE TRIGGER reject_feedback BEFORE INSERT ON feedback BEGIN SELECT RAISE(ABORT,'internal SQL failure'); END",
  );
  const response = await app.request('/feedback', {
    method: 'POST',
    body: new URLSearchParams(valid),
  });
  expect(response.status).toBe(500);
  const html = await response.text();
  expect(html).not.toContain('internal SQL failure');
  expect(html).not.toContain('感谢你的反馈');
  expect(JSON.stringify(logs)).not.toContain(valid.message);
  expect(count()).toEqual({ n: 0 });
});
