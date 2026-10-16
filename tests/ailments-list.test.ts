import { afterEach, beforeEach, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createDb } from '../src/db/index.js';
import { migrate } from '../src/db/migrate.js';
import { seed } from '../src/db/seed.js';

let db: ReturnType<typeof createDb>;
let app: ReturnType<typeof createApp>;
beforeEach(() => {
  db = createDb(':memory:');
  migrate(db);
  app = createApp(db);
});
afterEach(() => db.close());
function snapshot() {
  return ['agents', 'ailments', 'agent_ailments'].map((table) =>
    db.prepare(`SELECT * FROM ${table}`).all(),
  );
}

it('空库显示明确空状态，不自动填充', async () => {
  const before = snapshot();
  const res = await app.request('/ailments');
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toContain('text/html');
  const html = await res.text();
  expect(html).toContain('暂无病症');
  expect(html).not.toContain('<table');
  expect(snapshot()).toEqual(before);
});

it('显示全部课程名称与描述，正确排序，导航往返且只读', async () => {
  seed(db);
  const before = snapshot();
  const html = await (await app.request('/ailments')).text();
  expect(html).toContain('<title>病症目录 · AgentClinic</title>');
  expect(html.match(/<th scope="col">/g)).toHaveLength(2);
  expect(html.match(/<td>/g)).toHaveLength(12);
  const rows = db
    .prepare('SELECT name, description FROM ailments ORDER BY name, id')
    .all() as { name: string; description: string }[];
  const positions = rows.map(({ name, description }) => {
    expect(html).toContain(`<td>${description}</td>`);
    const position = html.indexOf(`<td>${name}</td>`);
    expect(position).toBeGreaterThan(-1);
    return position;
  });
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
  for (const route of ['/', '/agents', '/agents/1', '/ailments']) {
    const res = await app.request(route);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('<a href="/ailments">病症</a>');
  }
  expect(snapshot()).toEqual(before);
});

it('读取新增的未关联病症，同名按 ID 排序，特殊文本转义', async () => {
  await app.request('/ailments');
  const insert = db.prepare(
    'INSERT INTO ailments(id,name,description) VALUES(?,?,?)',
  );
  insert.run(20, 'Same', 'Second');
  insert.run(10, 'Same', 'First');
  insert.run(30, '<script>name</script>', '<img src=x> & text');
  const before = snapshot();
  const html = await (await app.request('/ailments')).text();
  expect(html.match(/<td>Same<\/td>/g)).toHaveLength(2);
  expect(html.indexOf('<td>First</td>')).toBeLessThan(
    html.indexOf('<td>Second</td>'),
  );
  expect(html).toContain('&lt;script&gt;name&lt;/script&gt;');
  expect(html).toContain('&lt;img src=x&gt; &amp; text');
  expect(html).not.toContain('<script>');
  expect(html).not.toContain('<img');
  expect(html).not.toContain('暂无病症');
  expect(snapshot()).toEqual(before);
});
