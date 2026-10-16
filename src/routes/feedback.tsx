import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import { FeedbackForm } from '../components/FeedbackForm.js';
import { Layout } from '../components/Layout.js';
import { saveFeedback } from '../db/feedback.js';
export function feedbackRouter(db: Database.Database) {
  const router = new Hono();
  router.get('/', (c) => c.html(<FeedbackForm />));
  router.post('/', async (c) => {
    const body = await c.req.parseBody({ all: true });
    const result = saveFeedback(db, body);
    if (!result.ok)
      return c.html(
        <FeedbackForm values={result.values} errors={result.errors} />,
        400,
      );
    return c.redirect('/feedback/success', 303);
  });
  router.get('/success', (c) =>
    c.html(
      <Layout title="反馈已收到 · AgentClinic">
        <article class="agent-detail">
          <h2>感谢你的反馈</h2>
          <p>提交成功后，反馈会保存供工作人员查看。</p>
          <p>
            <a href="/">返回首页</a>
          </p>
          <p>
            <a href="/feedback">提交另一条反馈</a>
          </p>
        </article>
      </Layout>,
    ),
  );
  return router;
}
