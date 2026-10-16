import { Layout } from '../components/Layout.js';
import type { CustomerReview } from '../data/reviews.js';

type ReviewsProps = { reviews: readonly CustomerReview[] };

export function Reviews({ reviews }: ReviewsProps) {
  return (
    <Layout title="客户评价 · AgentClinic">
      <h2>客户评价</h2>
      <p>
        <strong>以下评价为虚构演示内容</strong>
        ，不代表真实客户体验，也不来自访客反馈。
      </p>
      {reviews.map((review) => (
        <article class="agent-detail">
          <h3>{review.name}</h3>
          <p>评分：{review.rating} / 5</p>
          <p>{review.message}</p>
        </article>
      ))}
    </Layout>
  );
}
