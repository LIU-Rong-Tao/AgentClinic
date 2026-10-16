import { Layout } from './Layout.js';
export type FeedbackRecord = {
  id: number;
  nickname: string;
  message: string;
  rating: number;
  created_at: string;
};
type FeedbackListProps = { records: FeedbackRecord[] };
const formatTime = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
export function FeedbackList({ records }: FeedbackListProps) {
  return (
    <Layout title="访客反馈 · AgentClinic">
      <h2>访客反馈</h2>
      <p>最新提交在前，时间为北京时间（Asia/Shanghai）。</p>
      <p>
        <a href="/dashboard">返回员工仪表盘</a>
      </p>
      {records.length === 0 ? (
        <p>暂无反馈记录</p>
      ) : (
        records.map((record) => (
          <article class="agent-detail feedback-card">
            <h3>{record.nickname}</h3>
            <p>
              评分：{record.rating} / 5 ·{' '}
              <time datetime={record.created_at}>
                {formatTime(record.created_at)}
              </time>
            </p>
            <p class="feedback-message">{record.message}</p>
          </article>
        ))
      )}
    </Layout>
  );
}
