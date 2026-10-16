import { html } from 'hono/html';
import type { Child } from 'hono/jsx';
import { Header } from './Header.js';
import { Main } from './Main.js';
import { Footer } from './Footer.js';
type LayoutProps = {
  title: string;
  children: Child;
  showFooter?: boolean;
};

export function Layout({ title, children, showFooter = true }: LayoutProps) {
  return (
    <>
      {html`<!DOCTYPE html>`}
      <html lang="zh-CN" data-theme="light">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>{title}</title>
          <link rel="stylesheet" href="/vendor/pico.classless.min.css" />
          <link rel="stylesheet" href="/styles.css" />
        </head>
        <body>
          <div class="page">
            <Header />
            <Main>{children}</Main>
            {showFooter && <Footer />}
          </div>
        </body>
      </html>
    </>
  );
}
