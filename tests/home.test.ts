import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';

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

it('按语义组织首页并链接可访问的外部样式', async () => {
  const html = await (await app.request('/')).text();
  expect(html).toMatch(
    /<header>[\s\S]*?<h1>AgentClinic<\/h1>[\s\S]*?<\/header>/,
  );
  expect(html).toMatch(/<main>[\s\S]*?<p[^>]*>[^<]+<\/p>[\s\S]*?<\/main>/);
  expect(html).toMatch(
    /<footer>[\s\S]*?AgentClinic is open for business[\s\S]*?<\/footer>/,
  );
  const href = html.match(/<link[^>]*href="([^"]+)"/)?.[1];
  expect(href).toBeTruthy();
  const css = await app.request(href!);
  expect(css.status).toBe(200);
  expect(css.headers.get('content-type')).toMatch(/^text\/css(?:;|$)/);
  expect((await css.text()).trim().length).toBeGreaterThan(0);
  expect(html).not.toContain('<style>');
});
