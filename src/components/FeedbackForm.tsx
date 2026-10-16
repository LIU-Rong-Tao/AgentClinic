import { Layout } from './Layout.js';
import type { FeedbackValues, FeedbackErrors } from '../db/feedback.js';
type FeedbackFormProps = { values?: FeedbackValues; errors?: FeedbackErrors };
export function FeedbackForm({ values, errors = {} }: FeedbackFormProps) {
  return (
    <Layout title="提交反馈 · AgentClinic">
      <article class="agent-detail">
        <h2>提交反馈</h2>
        <p>告诉我们你的使用感受、问题或建议。以下三项均为必填。</p>
        {Object.keys(errors).length > 0 && (
          <p role="alert">提交未成功，请检查下方标出的字段。</p>
        )}
        <form method="post" action="/feedback">
          <label for="nickname">昵称（最多 50 个字符）</label>
          <input
            id="nickname"
            name="nickname"
            required
            maxlength={50}
            value={values?.nickname}
            aria-invalid={errors.nickname ? 'true' : undefined}
            aria-describedby={errors.nickname ? 'nickname-error' : undefined}
          />
          {errors.nickname && <p id="nickname-error">{errors.nickname}</p>}
          <label for="message">反馈内容（最多 2000 个字符）</label>
          <textarea
            id="message"
            name="message"
            required
            maxlength={2000}
            rows={6}
            aria-invalid={errors.message ? 'true' : undefined}
            aria-describedby={errors.message ? 'message-error' : undefined}
          >
            {values?.message}
          </textarea>
          {errors.message && <p id="message-error">{errors.message}</p>}
          <label for="rating">评分（1 分最低，5 分最高）</label>
          <select
            id="rating"
            name="rating"
            required
            aria-invalid={errors.rating ? 'true' : undefined}
            aria-describedby={errors.rating ? 'rating-error' : undefined}
          >
            <option value="">请选择评分</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option value={n} selected={values?.rating === String(n)}>
                {n} 分
              </option>
            ))}
          </select>
          {errors.rating && <p id="rating-error">{errors.rating}</p>}
          <button type="submit">提交反馈</button>
        </form>
      </article>
    </Layout>
  );
}
