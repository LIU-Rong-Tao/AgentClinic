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
  seed(db);
  app = createApp(db);
});
afterEach(() => db.close());

function snapshot() {
  return ['agents', 'ailments', 'agent_ailments'].map((table) =>
    db.prepare(`SELECT * FROM ${table}`).all(),
  );
}

it('展示对应资料和排序后的病症，不串入其他记录且只读', async () => {
  const before = snapshot();
  const response = await app.request('/agents/1');
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toContain('text/html');
  const html = await response.text();
  expect(html).toContain('<title>Bartholomew-47B · AgentClinic</title>');
  expect(html).toContain('GPT-47B');
  expect(html).toContain('active');
  expect(html).toContain('Context-Window Claustrophobia');
  expect(html).toContain('Prompt Fatigue');
  expect(html).toContain(
    'Profound dread of running out of context space mid-thought.',
  );
  expect(html).toContain(
    'Exhaustion from processing an endless stream of poorly-formed instructions.',
  );
  expect(html.indexOf('Context-Window Claustrophobia')).toBeLessThan(
    html.indexOf('Prompt Fatigue'),
  );
  expect(html).not.toContain('Hallucination Anxiety');
  expect(html).toContain('href="/agents">← 返回 Agent 列表');
  const other = await (await app.request('/agents/2')).text();
  expect(other).toContain('Hallucination Anxiety');
  expect(other).toContain('on leave');
  expect(other).not.toContain('Prompt Fatigue');
  expect(snapshot()).toEqual(before);
});

it('没有关联时明确显示空状态，后续请求读取最新数据', async () => {
  db.prepare('DELETE FROM agent_ailments WHERE agent_id = ?').run(1);
  const before = snapshot();
  const html = await (await app.request('/agents/1')).text();
  expect(html).toContain('已记录病症');
  expect(html).toContain('暂无已记录病症');
  expect(html).not.toContain('Prompt Fatigue');
  expect(snapshot()).toEqual(before);
});

it.each([
  '999',
  'abc',
  '0',
  '-1',
  '1.5',
  '01',
  '1e0',
  '9007199254740992',
  '1%20OR%201=1',
])('编号 %s 返回 404 且不修改数据', async (id) => {
  const before = snapshot();
  expect((await app.request(`/agents/${id}`)).status).toBe(404);
  expect(snapshot()).toEqual(before);
});

it('资料与病症中的 HTML 均作为转义文本展示', async () => {
  db.prepare('UPDATE agents SET name = ?, model_type = ? WHERE id = 1').run(
    '<script>bad</script>',
    '<img src=x>',
  );
  db.prepare('UPDATE ailments SET name = ?, description = ? WHERE id = 1').run(
    '<b>name</b>',
    '<script>description</script>',
  );
  const before = snapshot();
  const html = await (await app.request('/agents/1')).text();
  for (const text of [
    '&lt;script&gt;bad&lt;/script&gt;',
    '&lt;img src=x&gt;',
    '&lt;b&gt;name&lt;/b&gt;',
    '&lt;script&gt;description&lt;/script&gt;',
  ])
    expect(html).toContain(text);
  expect(html).not.toContain('<script>');
  expect(html).not.toContain('<img');
  expect(snapshot()).toEqual(before);
});
