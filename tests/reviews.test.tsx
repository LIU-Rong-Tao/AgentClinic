/** @jsxImportSource hono/jsx */
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createDb } from '../src/db/index.js';
import { migrate } from '../src/db/migrate.js';
import { createApp } from '../src/app.js';
import { Reviews } from '../src/pages/Reviews.js';
import { customerReviews } from '../src/data/reviews.js';
let db: ReturnType<typeof createDb>;
beforeEach(() => {
  db = createDb(':memory:');
  migrate(db);
});
afterEach(() => db.close());
it('导航到达评价页，三条内容完整且有明确虚构说明', async () => {
  const app = createApp(db);
  expect(await (await app.request('/')).text()).toContain(
    'href="/reviews">客户评价',
  );
  const response = await app.request('/reviews');
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toContain('text/html');
  const html = await response.text();
  expect(html).toContain('<strong>以下评价为虚构演示内容</strong>');
  expect(customerReviews).toHaveLength(3);
  const cards = [
    ...html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/g),
  ].map((match) => match[1]);
  expect(cards).toHaveLength(3);
  let previous = -1;
  for (const [index, review] of customerReviews.entries()) {
    const card = cards[index];
    expect(review.name.trim()).not.toBe('');
    expect(review.message.trim()).not.toBe('');
    expect(Number.isInteger(review.rating)).toBe(true);
    expect(review.rating).toBeGreaterThanOrEqual(1);
    expect(review.rating).toBeLessThanOrEqual(5);
    expect(card).toContain(`<h3>${review.name}</h3>`);
    expect(card).toContain(review.message);
    expect(card).toContain(`评分：${review.rating} / 5`);
    const position = html.indexOf(`<h3>${review.name}</h3>`);
    expect(position).toBeGreaterThan(previous);
    previous = position;
  }
});
it('名称与正文按文字转义', () => {
  const html = (
    <Reviews
      reviews={[
        {
          name: '<b>名字</b>',
          message: '<script>alert(1)</script>',
          rating: 4,
        },
      ]}
    />
  ).toString();
  expect(html).toContain('&lt;b&gt;名字&lt;/b&gt;');
  expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  expect(html).not.toContain('<script>');
  expect(html).not.toContain('<b>名字');
});
it('不公开真实反馈、不写入数据，数据库关闭后评价页仍可独立渲染', async () => {
  db.prepare('INSERT INTO feedback(nickname,message,rating) VALUES(?,?,?)').run(
    '真实访客保密昵称',
    '真实反馈保密正文',
    2,
  );
  const app = createApp(db);
  const snapshot = () =>
    [
      'agents',
      'ailments',
      'agent_ailments',
      'therapies',
      'ailment_therapies',
      'appointments',
      'feedback',
    ].map((table) => db.prepare(`SELECT * FROM ${table}`).all());
  const before = snapshot();
  const html = await (await app.request('/reviews')).text();
  expect(html).not.toContain('真实访客保密昵称');
  expect(html).not.toContain('真实反馈保密正文');
  expect(snapshot()).toEqual(before);
  // 路由初始化后关闭数据库，确保评价请求本身不依赖查询。
  db.close();
  expect((await app.request('/reviews')).status).toBe(200);
  db = createDb(':memory:');
});
