import { html } from 'hono/html';
import { Header } from './Header.js';
import { Main } from './Main.js';
import { Footer } from './Footer.js';
export function Layout() {
  return (
    <>
      {html`<!DOCTYPE html>`}
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>AgentClinic · 给 AI 一点喘息空间</title>
          <link rel="stylesheet" href="/styles.css" />
        </head>
        <body>
          <div class="page">
            <Header />
            <Main />
            <Footer />
          </div>
        </body>
      </html>
    </>
  );
}
