import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

function dataSnapshot() {
  return {
    agents: db.prepare('SELECT * FROM agents ORDER BY id').all(),
    ailments: db.prepare('SELECT * FROM ailments ORDER BY id').all(),
    links: db
      .prepare('SELECT * FROM agent_ailments ORDER BY agent_id, ailment_id')
      .all(),
  };
}

describe('Agent 列表页', () => {
  it('空库返回正常空状态，不自动填充数据', async () => {
    const before = dataSnapshot();
    const response = await app.request('/agents');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^text\/html(?:;|$)/);
    const html = await response.text();
    expect(html).toContain('<title>Agents · AgentClinic</title>');
    expect(html).toContain('暂无 Agent');
    expect(html).not.toContain('<table');
    expect(dataSnapshot()).toEqual(before);
  });

  it('显示课程三列、按名称排列，导航和详情链接可往返', async () => {
    seed(db);
    const before = dataSnapshot();
    const response = await app.request('/agents');
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toMatch(/^<!DOCTYPE html>/i);
    expect(html.match(/<main>/g)).toHaveLength(1);
    expect(html.match(/<th scope="col">/g)).toHaveLength(3);
    expect(html.match(/<td>/g)).toHaveLength(18);
    const names = [
      'Agatha-nano',
      'Bartholomew-47B',
      'Cornelius-7B',
      'Hildegard-4B',
      'Penelope-mini',
      'Reginald-7B',
    ];
    const positions = names.map((name) => html.indexOf(`>${name}</a>`));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    for (const text of [
      'GPT-47B',
      'Claude-mini',
      'active',
      'on leave',
      'discharged',
    ]) {
      expect(html).toContain(`<td>${text}</td>`);
    }
    expect(html).not.toContain('on_leave');
    const links = [...html.matchAll(/<a[^>]*href="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(links).toEqual([
      '/',
      '/agents',
      '/ailments',
      '/therapies',
      '/dashboard',
      '/agents/4',
      '/agents/1',
      '/agents/5',
      '/agents/6',
      '/agents/2',
      '/agents/3',
    ]);
    for (const link of links)
      expect((await app.request(link)).status).toBe(200);
    expect(dataSnapshot()).toEqual(before);
  });

  it('同一个应用实例后续请求读取最新记录，同名按 ID 排序', async () => {
    expect(await (await app.request('/agents')).text()).toContain('暂无 Agent');
    const insert = db.prepare(
      'INSERT INTO agents (id, name, model_type, status) VALUES (?, ?, ?, ?)',
    );
    insert.run(20, 'Same name', 'Model-last', 'active');
    insert.run(10, 'Same name', 'Model-first', 'on_leave');
    const before = dataSnapshot();
    const html = await (await app.request('/agents')).text();
    expect(html.match(/>Same name<\/a>/g)).toHaveLength(2);
    expect(html.indexOf('Model-first')).toBeLessThan(
      html.indexOf('Model-last'),
    );
    expect(html).not.toContain('暂无 Agent');
    expect(dataSnapshot()).toEqual(before);
  });

  it('数据库中的 HTML 特殊字符以文本显示', async () => {
    db.prepare(
      'INSERT INTO agents (name, model_type, status) VALUES (?, ?, ?)',
    ).run(
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(2)> & model',
      'active',
    );
    const before = dataSnapshot();
    const html = await (await app.request('/agents')).text();
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(2)&gt; &amp; model');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(dataSnapshot()).toEqual(before);
  });
});
