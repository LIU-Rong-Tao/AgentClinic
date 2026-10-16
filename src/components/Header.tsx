export function Header() {
  return (
    <header>
      <h1>AgentClinic</h1>
      <nav class="site-nav" aria-label="主导航">
        <ul>
          <li>
            <a href="/">首页</a>
          </li>
          <li>
            <a href="/agents">Agents</a>
          </li>
          <li>
            <a href="/ailments">病症</a>
          </li>
          <li>
            <a href="/therapies">疗法</a>
          </li>
          <li>
            <a href="/dashboard">员工仪表盘</a>
          </li>
          <li>
            <a href="/feedback">反馈</a>
          </li>
          <li>
            <a href="/reviews">客户评价</a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
