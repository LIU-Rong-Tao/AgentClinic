import { Layout } from '../components/Layout.js';
type ErrorPageProps = { status: 404 | 500 };
export function ErrorPage({ status }: ErrorPageProps) {
  return (
    <Layout title={`${status} · AgentClinic`} showFooter={false}>
      <h2>
        {status === 404 ? '404 · 页面或记录不存在' : '500 · 请求暂时无法处理'}
      </h2>
      <p>
        {status === 404
          ? '请检查地址，或通过导航返回已有页面。'
          : '处理请求时发生了内部错误，请稍后再试。如果刚才提交了预约或状态更新，请先查看预约记录，确认结果后再决定是否重新操作。'}
      </p>
      <p>
        <a href="/">返回首页</a>
      </p>
      <p>
        <a href="/dashboard">查看员工仪表盘</a>
      </p>
    </Layout>
  );
}
