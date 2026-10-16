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
        </ul>
      </nav>
    </header>
  );
}
