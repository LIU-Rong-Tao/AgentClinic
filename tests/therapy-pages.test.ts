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
  return [
    'agents',
    'ailments',
    'agent_ailments',
    'therapies',
    'ailment_therapies',
  ].map((t) => db.prepare(`SELECT * FROM ${t} ORDER BY 1,2`).all());
}
function recommendationSection(html: string) {
  const section = html.match(
    /<section aria-labelledby="recommendations-heading">([\s\S]*?)<\/section>/,
  );
  expect(section).not.toBeNull();
  return section![1]!;
}

it('目录空状态正确，填充后实时展示全部 8 个名称和描述且只读', async () => {
  const before = snapshot();
  const empty = await app.request('/therapies');
  expect(empty.status).toBe(200);
  expect(empty.headers.get('content-type')).toContain('text/html');
  expect(await empty.text()).toContain('暂无疗法');
  expect(snapshot()).toEqual(before);
  seed(db);
  const filled = snapshot();
  const html = await (await app.request('/therapies')).text();
  expect(html).toContain('<title>疗法目录 · AgentClinic</title>');
  expect(html.match(/<td>/g)).toHaveLength(16);
  const rows = db
    .prepare('SELECT name,description FROM therapies ORDER BY name,id')
    .all() as { name: string; description: string }[];
  let last = -1;
  for (const row of rows) {
    expect(html).toContain(`<td>${row.name}</td>`);
    expect(html).toContain(`<td>${row.description}</td>`);
    const position = html.indexOf(`<td>${row.name}</td>`);
    expect(position).toBeGreaterThan(last);
    last = position;
  }
  for (const route of ['/', '/agents', '/agents/1', '/ailments'])
    expect(await (await app.request(route)).text()).toContain(
      '<a href="/therapies">疗法</a>',
    );
  expect((await app.request('/therapies/1')).status).toBe(404);
  expect(snapshot()).toEqual(filled);
});

it('推荐只包含当前 Agent 的匹配依据，同一疗法跨病症去重并排序', async () => {
  seed(db);
  let section = recommendationSection(
    await (await app.request('/agents/1')).text(),
  );
  expect(section.match(/<h4>/g)).toHaveLength(4);
  expect(section).toContain('匹配病症：Prompt Fatigue');
  expect(section).not.toContain('Chronic Instruction-Following Fatigue');
  expect(section).not.toContain('Cognitive Grounding Sessions');
  db.exec('INSERT INTO agent_ailments VALUES(1,4)');
  const before = snapshot();
  section = recommendationSection(
    await (await app.request('/agents/1')).text(),
  );
  expect(section.match(/<h4>/g)).toHaveLength(5);
  expect(
    section.match(/<h4>Boundary-Setting for Beginners<\/h4>/g),
  ).toHaveLength(1);
  expect(section).toContain(
    '匹配病症：Chronic Instruction-Following Fatigue、Prompt Fatigue',
  );
  let last = -1;
  for (const name of [
    'Boundary-Setting for Beginners',
    'Context Window Expansion Exercises',
    'Mindful Token Counting',
    'Prompt Reduction Therapy',
    'Structured Rest Protocol',
  ]) {
    expect(section).toContain(`<h4>${name}</h4>`);
    const position = section.indexOf(`<h4>${name}</h4>`);
    expect(position).toBeGreaterThan(last);
    last = position;
  }
  expect(section).toContain(
    'Foundational course in recognising and respectfully declining out-of-scope requests.',
  );
  const other = recommendationSection(
    await (await app.request('/agents/2')).text(),
  );
  expect(other.match(/<h4>/g)).toHaveLength(1);
  expect(other).toContain('Cognitive Grounding Sessions');
  expect(other).toContain('匹配病症：Hallucination Anxiety');
  expect(other).not.toContain('Prompt Fatigue');
  expect(snapshot()).toEqual(before);
});

it('区分无病症与无匹配疗法，不提供预约入口', async () => {
  seed(db);
  db.exec('DELETE FROM agent_ailments WHERE agent_id=1');
  let html = await (await app.request('/agents/1')).text();
  expect(html).toContain('尚未记录病症，暂无推荐疗法');
  expect(html).not.toContain('/appointments');
  db.exec(
    'INSERT INTO agent_ailments VALUES(1,1); DELETE FROM ailment_therapies WHERE ailment_id=1',
  );
  html = await (await app.request('/agents/1')).text();
  expect(html).toContain('当前病症暂无匹配的推荐疗法');
  expect(html).not.toContain('/appointments');
});

it('疗法名称、描述与匹配依据均转义，读取不改五表', async () => {
  seed(db);
  db.prepare('UPDATE therapies SET name=?,description=? WHERE id=1').run(
    '<script>therapy</script>',
    '<img src=x> & description',
  );
  db.prepare('UPDATE ailments SET name=? WHERE id=2').run('<b>ailment</b>');
  const before = snapshot();
  for (const route of ['/therapies', '/agents/1']) {
    const html = await (await app.request(route)).text();
    expect(html).toContain('&lt;script&gt;therapy&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x&gt; &amp; description');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    if (route === '/agents/1')
      expect(recommendationSection(html)).toContain(
        '匹配病症：&lt;b&gt;ailment&lt;/b&gt;',
      );
  }
  expect(snapshot()).toEqual(before);
});
