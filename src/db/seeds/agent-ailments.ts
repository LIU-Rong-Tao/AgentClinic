import type Database from 'better-sqlite3';

const links: [number, number][] = [
  [1, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 1],
  [6, 3],
];

export function seedAgentAilments(db: Database.Database) {
  const insert = db.prepare<[number, number]>(`
    INSERT INTO agent_ailments (agent_id, ailment_id) VALUES (?, ?)
    ON CONFLICT(agent_id, ailment_id) DO NOTHING
  `);
  return db
    .transaction(() => {
      let inserted = 0;
      for (const [agentId, ailmentId] of links) {
        inserted += insert.run(agentId, ailmentId).changes;
      }
      return { inserted, skipped: links.length - inserted };
    })
    .immediate();
}
