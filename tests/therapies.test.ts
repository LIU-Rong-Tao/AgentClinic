import { afterEach, beforeEach, expect, it } from 'vitest';
import { createDb } from '../src/db/index.js';
import { migrate } from '../src/db/migrate.js';
import { seed } from '../src/db/seed.js';
import { seedAgents } from '../src/db/seeds/agents.js';
import { seedAilments } from '../src/db/seeds/ailments.js';
import { seedAgentAilments } from '../src/db/seeds/agent-ailments.js';
import { readFileSync } from 'node:fs';

let db: ReturnType<typeof createDb>;
beforeEach(() => {
  db = createDb(':memory:');
});
afterEach(() => db.close());
function snapshot() {
  return [
    'agents',
    'ailments',
    'agent_ailments',
    'therapies',
    'ailment_therapies',
  ].map((t) => db.prepare(`SELECT * FROM ${t} ORDER BY 1, 2`).all());
}

it('升级旧三表时保留已有数据，追加后续迁移且不自动填充', () => {
  db.exec(
    'CREATE TABLE _migrations(name TEXT PRIMARY KEY, applied_at TEXT DEFAULT CURRENT_TIMESTAMP)',
  );
  for (const name of [
    '001_create_agents.sql',
    '002_create_ailments.sql',
    '003_create_agent_ailments.sql',
  ]) {
    db.exec(
      readFileSync(
        new URL(`../src/db/migrations/${name}`, import.meta.url),
        'utf8',
      ),
    );
    db.prepare('INSERT INTO _migrations(name) VALUES(?)').run(name);
  }
  seedAgents(db);
  seedAilments(db);
  seedAgentAilments(db);
  const old = ['agents', 'ailments', 'agent_ailments'].map((t) =>
    db.prepare(`SELECT * FROM ${t} ORDER BY 1, 2`).all(),
  );
  expect(migrate(db)).toEqual([
    '004_create_therapies.sql',
    '005_create_ailment_therapies.sql',
    '006_appointments.sql',
    '007_feedback.sql',
  ]);
  expect(migrate(db)).toEqual([]);
  expect(snapshot()).toEqual([...old, [], []]);
});

it('填充 8 个疗法和 9 对推荐，重复执行保留原有内容及额外关系', () => {
  migrate(db);
  expect(seed(db)).toMatchObject({
    therapies: { inserted: 8, skipped: 0 },
    recommendations: { inserted: 9, skipped: 0 },
  });
  expect(
    db
      .prepare(
        'SELECT ailment_id, therapy_id FROM ailment_therapies ORDER BY 1,2',
      )
      .all(),
  ).toEqual(
    [
      [1, 2],
      [1, 8],
      [2, 1],
      [2, 7],
      [3, 3],
      [4, 4],
      [4, 7],
      [5, 5],
      [6, 6],
    ].map(([ailment_id, therapy_id]) => ({ ailment_id, therapy_id })),
  );
  db.exec(
    "UPDATE therapies SET description='已编辑描述' WHERE id=1; INSERT INTO therapies(id,name,description) VALUES(99,'Extra','Other'); INSERT INTO ailment_therapies VALUES(1,99)",
  );
  const before = snapshot();
  expect(seed(db)).toMatchObject({
    therapies: { inserted: 0, skipped: 8 },
    recommendations: { inserted: 0, skipped: 9 },
  });
  expect(snapshot()).toEqual(before);
  db.exec(
    'DELETE FROM ailment_therapies WHERE therapy_id=8; DELETE FROM therapies WHERE id=8',
  );
  expect(seed(db)).toMatchObject({
    therapies: { inserted: 1, skipped: 7 },
    recommendations: { inserted: 1, skipped: 8 },
  });
  expect(
    db.prepare('SELECT description FROM therapies WHERE id=1').get(),
  ).toEqual({ description: '已编辑描述' });
});

it('推荐可跨多个病症汇总去重，未关联 Agent 无推荐', () => {
  migrate(db);
  seed(db);
  db.exec('INSERT INTO agent_ailments VALUES(1,4)');
  const query = db.prepare(`SELECT DISTINCT t.id, t.name FROM therapies t
    JOIN ailment_therapies at ON at.therapy_id=t.id
    JOIN agent_ailments aa ON aa.ailment_id=at.ailment_id
    WHERE aa.agent_id=? ORDER BY t.name,t.id`);
  expect(query.all(1)).toEqual([
    { id: 7, name: 'Boundary-Setting for Beginners' },
    { id: 2, name: 'Context Window Expansion Exercises' },
    { id: 8, name: 'Mindful Token Counting' },
    { id: 1, name: 'Prompt Reduction Therapy' },
    { id: 4, name: 'Structured Rest Protocol' },
  ]);
  expect(query.all(999)).toEqual([]);
});

it('同名不同 ID 冲突使五表新增整体回滚，已有记录与迁移保留', () => {
  migrate(db);
  db.exec(
    "INSERT INTO therapies(id,name,description) VALUES(99,'Prompt Reduction Therapy','Existing')",
  );
  const before = snapshot();
  expect(() => seed(db)).toThrow('UNIQUE constraint failed');
  expect(snapshot()).toEqual(before);
  expect(db.prepare('SELECT COUNT(*) AS count FROM _migrations').get()).toEqual(
    { count: 7 },
  );
  db.exec('DELETE FROM therapies WHERE id=99');
  expect(seed(db).therapies.inserted).toBe(8);
});

it('最后一条推荐失败时五表整体回滚，原数据保留，修复后可重试', () => {
  migrate(db);
  db.exec(`INSERT INTO agents(id,name,model_type,status) VALUES(99,'Existing','Model','active');
    CREATE TRIGGER reject_recommendation BEFORE INSERT ON ailment_therapies
    WHEN NEW.ailment_id=6 AND NEW.therapy_id=6
    BEGIN SELECT RAISE(ABORT,'recommendation failure'); END;`);
  const before = snapshot();
  expect(() => seed(db)).toThrow('recommendation failure');
  expect(snapshot()).toEqual(before);
  expect(db.inTransaction).toBe(false);
  db.exec('DROP TRIGGER reject_recommendation');
  expect(seed(db).recommendations.inserted).toBe(9);
  expect(db.prepare('SELECT name FROM agents WHERE id=99').get()).toEqual({
    name: 'Existing',
  });
});

it('约束拒绝缺失字段、重复名称/关系、无效外键及删除被引用疗法', () => {
  migrate(db);
  seed(db);
  const before = snapshot();
  for (const sql of [
    "INSERT INTO therapies(name,description) VALUES(NULL,'x')",
    "INSERT INTO therapies(name,description) VALUES('x',NULL)",
    "INSERT INTO therapies(name,description,created_at) VALUES('x','x',NULL)",
    "INSERT INTO therapies(name,description) VALUES('Prompt Reduction Therapy','x')",
    'INSERT INTO ailment_therapies VALUES(1,2)',
    'INSERT INTO ailment_therapies VALUES(999,1)',
    'INSERT INTO ailment_therapies VALUES(1,999)',
    'INSERT INTO ailment_therapies VALUES(NULL,1)',
    'INSERT INTO ailment_therapies VALUES(1,NULL)',
    'DELETE FROM therapies WHERE id=1',
  ])
    expect(() => db.exec(sql)).toThrow(/constraint failed/);
  expect(snapshot()).toEqual(before);
  expect(db.pragma('foreign_key_check')).toEqual([]);
});
