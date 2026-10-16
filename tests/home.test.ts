import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createDb } from '../src/db/index.js';
import { migrate } from '../src/db/migrate.js';

const db = createDb(':memory:');
migrate(db);
const app = createApp(db);
afterAll(() => db.close());

describe('最小 AgentClinic 首页', () => {
  it('返回成功的 HTML 响应', async () => {
    const response = await app.request('/');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^text\/html(?:;|$)/);
  });
  it('提供标题、独立简介和营业提示', async () => {
    const html = await (await app.request('/')).text();
    expect(html).toMatch(/<h1(?:\s[^>]*)?>AgentClinic<\/h1>/);
    const paragraphs = [
      ...html.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g),
    ].map((match) => match[1].replace(/<[^>]+>/g, '').trim());
    expect(paragraphs).toContain('AgentClinic is open for business');
    expect(
      paragraphs.some(
        (text) =>
          text.length > 0 && text !== 'AgentClinic is open for business',
      ),
    ).toBe(true);
    expect(html).toMatch(/^<!DOCTYPE html>/i);
  });
});

it('提供首页导航，并按基础样式、品牌样式的顺序加载本地 CSS', async () => {
  const html = await (await app.request('/')).text();
  expect(html).toMatch(
    /<header>[\s\S]*?<h1>AgentClinic<\/h1>[\s\S]*?<\/header>/,
  );
  expect(html).toMatch(/<main>[\s\S]*?<p[^>]*>[^<]+<\/p>[\s\S]*?<\/main>/);
  expect(html.match(/<main>/g)).toHaveLength(1);
  expect(html).toMatch(
    /<nav[^>]*aria-label="主导航"[^>]*>[\s\S]*?<a href="\/">首页<\/a>[\s\S]*?<\/nav>/,
  );
  const links = [...html.matchAll(/<a[^>]*href="([^"]+)"/g)].map(
    (match) => match[1],
  );
  expect(links).toEqual([
    '/',
    '/agents',
    '/ailments',
    '/therapies',
    '/dashboard',
    '/feedback',
  ]);
  expect(html).toMatch(
    /<footer>[\s\S]*?AgentClinic is open for business[\s\S]*?<\/footer>/,
  );
  const stylesheets = [...html.matchAll(/<link[^>]*href="([^"]+)"/g)].map(
    (match) => match[1],
  );
  expect(stylesheets).toEqual([
    '/vendor/pico.classless.min.css',
    '/styles.css',
  ]);
  for (const href of stylesheets) {
    const css = await app.request(href);
    expect(css.status).toBe(200);
    expect(css.headers.get('content-type')).toMatch(/^text\/css(?:;|$)/);
    expect((await css.text()).trim().length).toBeGreaterThan(0);
  }
  expect(html).not.toContain('<style>');
});
