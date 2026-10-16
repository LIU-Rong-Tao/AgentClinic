import { createDb } from './index.js';
import { migrate } from './migrate.js';
import { seed } from './seed.js';

const db = createDb(process.env.DATABASE_PATH);
try {
  migrate(db);
  const result = seed(db);
  console.log(
    `Agents 示例数据：新增 ${result.agents.inserted}，跳过 ${result.agents.skipped}。`,
  );
  console.log(
    `病症示例数据：新增 ${result.ailments.inserted}，跳过 ${result.ailments.skipped}。`,
  );
  console.log(
    `示例关联：新增 ${result.links.inserted}，跳过 ${result.links.skipped}。`,
  );
  console.log(`数据库：${db.name}`);
} finally {
  db.close();
}
