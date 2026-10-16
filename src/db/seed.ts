import type Database from 'better-sqlite3';
import { seedAgents } from './seeds/agents.js';
import { seedAilments } from './seeds/ailments.js';
import { seedAgentAilments } from './seeds/agent-ailments.js';
import { seedTherapies } from './seeds/therapies.js';
import { seedAilmentTherapies } from './seeds/ailment-therapies.js';

export function seed(db: Database.Database) {
  // 子事务使用保存点；任一步失败由外层事务撤回本次全部新增数据。
  return db
    .transaction(() => {
      const agents = seedAgents(db);
      const ailments = seedAilments(db);
      const links = seedAgentAilments(db);
      const therapies = seedTherapies(db);
      const recommendations = seedAilmentTherapies(db);
      return { agents, ailments, links, therapies, recommendations };
    })
    .immediate();
}
