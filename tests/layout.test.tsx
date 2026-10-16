/** @jsxImportSource hono/jsx */
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { Layout } from '../src/components/Layout.js';

describe('共享布局', () => {
  it.each([
    ['页面甲 · AgentClinic', '页面甲的独立内容'],
    ['页面乙 · AgentClinic', '页面乙的独立内容'],
  ])('为 %s 渲染调用方提供的标题和正文', async (title, content) => {
    const fixture = new Hono();
    fixture.get('/', (c) =>
      c.html(
        <Layout title={title}>
          <p>{content}</p>
        </Layout>,
      ),
    );
    const html = await (await fixture.request('/')).text();
    expect(html).toContain(`<title>${title}</title>`);
    expect(html).toContain(`<main><p>${content}</p></main>`);
    expect(html.match(/<main>/g)).toHaveLength(1);
    expect(html).not.toContain('刚读完四百页');
  });

  it('将标题和正文中的 HTML 字符当作文本处理', async () => {
    const fixture = new Hono();
    fixture.get('/', (c) =>
      c.html(
        <Layout title={'标题 <script> & 文本'}>
          <p>{'内容 <script> & 文本'}</p>
        </Layout>,
      ),
    );
    const html = await (await fixture.request('/')).text();
    expect(html).toContain('<title>标题 &lt;script&gt; &amp; 文本</title>');
    expect(html).toContain('<p>内容 &lt;script&gt; &amp; 文本</p>');
    expect(html).not.toContain('<script>');
  });
});
