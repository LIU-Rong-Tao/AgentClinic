import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb } from '../src/db/index.js';
import { migrate } from '../src/db/migrate.js';
import { seed } from '../src/db/seed.js';
import { seedAgents } from '../src/db/seeds/agents.js';
import { seedAilments } from '../src/db/seeds/ailments.js';

type ClinicDatabase = ReturnType<typeof createDb>;

const workRoot = fileURLToPath(new URL('../work', import.meta.url));
let temporaryDirectory: string;
let databases: ClinicDatabase[];

function openDatabase() {
  const db = createDb(join(temporaryDirectory, 'ailments.db'));
  databases.push(db);
  return db;
}

function snapshot(db: ClinicDatabase) {
  return {
    agents: db.prepare('SELECT * FROM agents ORDER BY id').all(),
    ailments: db.prepare('SELECT * FROM ailments ORDER BY id').all(),
    links: db
      .prepare('SELECT * FROM agent_ailments ORDER BY agent_id, ailment_id')
      .all(),
  };
}

beforeEach(() => {
  mkdirSync(workRoot, { recursive: true });
  temporaryDirectory = mkdtempSync(join(workRoot, 'ailments-tests-'));
  databases = [];
});

afterEach(() => {
  for (const db of databases) {
    if (db.open) db.close();
  }
  if (
    dirname(temporaryDirectory) !== workRoot ||
    !basename(temporaryDirectory).startsWith('ailments-tests-')
  ) {
    throw new Error('测试清理路径超出当前项目的临时目录');
  }
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('病症与 Agent 关联', () => {
  it('从只有 Agents 的数据库追加迁移，保留已有数据且不自动填充新表', () => {
    const db = openDatabase();
    const legacy = join(temporaryDirectory, 'legacy-migrations');
    mkdirSync(legacy);
    copyFileSync(
      new URL('../src/db/migrations/001_create_agents.sql', import.meta.url),
      join(legacy, '001_create_agents.sql'),
    );
    migrate(db, legacy);
    seedAgents(db);
    const agentsBefore = db.prepare('SELECT * FROM agents ORDER BY id').all();

    expect(migrate(db)).toEqual([
      '002_create_ailments.sql',
      '003_create_agent_ailments.sql',
    ]);
    expect(migrate(db)).toEqual([]);
    expect(snapshot(db)).toEqual({
      agents: agentsBefore,
      ailments: [],
      links: [],
    });
    expect(db.prepare('PRAGMA table_info(ailments)').all()).toEqual([
      expect.objectContaining({ name: 'id', type: 'INTEGER', pk: 1 }),
      expect.objectContaining({ name: 'name', type: 'TEXT', notnull: 1 }),
      expect.objectContaining({
        name: 'description',
        type: 'TEXT',
        notnull: 1,
      }),
    ]);
    expect(db.prepare('PRAGMA table_info(agent_ailments)').all()).toEqual([
      expect.objectContaining({ name: 'agent_id', notnull: 1, pk: 1 }),
      expect.objectContaining({ name: 'ailment_id', notnull: 1, pk: 2 }),
    ]);
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(db.prepare('PRAGMA foreign_key_list(agent_ailments)').all()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'agents',
          from: 'agent_id',
          to: 'id',
          on_delete: 'NO ACTION',
        }),
        expect.objectContaining({
          table: 'ailments',
          from: 'ailment_id',
          to: 'id',
          on_delete: 'NO ACTION',
        }),
      ]),
    );
  });

  it.each([
    { name: null, description: '有效描述' },
    { name: '有效名称', description: null },
  ])('拒绝缺少名称或描述的病症：$name / $description', (record) => {
    const db = openDatabase();
    migrate(db);
    expect(() =>
      db
        .prepare(
          'INSERT INTO ailments (name, description) VALUES (@name, @description)',
        )
        .run(record),
    ).toThrow('NOT NULL constraint failed');
    expect(snapshot(db).ailments).toEqual([]);
  });

  it.each([
    { agentId: null, ailmentId: 1, error: 'NOT NULL constraint failed' },
    { agentId: 1, ailmentId: null, error: 'NOT NULL constraint failed' },
    { agentId: 999, ailmentId: 1, error: 'FOREIGN KEY constraint failed' },
    { agentId: 1, ailmentId: 999, error: 'FOREIGN KEY constraint failed' },
  ])(
    '拒绝空值或不存在的关联：$agentId → $ailmentId',
    ({ agentId, ailmentId, error }) => {
      const db = openDatabase();
      migrate(db);
      seedAgents(db);
      seedAilments(db);
      expect(() =>
        db
          .prepare(
            'INSERT INTO agent_ailments (agent_id, ailment_id) VALUES (?, ?)',
          )
          .run(agentId, ailmentId),
      ).toThrow(error);
      expect(snapshot(db).links).toEqual([]);
    },
  );

  it('保存课程六个病症与八对关系，联表查询正确且重开重跑不重复', () => {
    const db = openDatabase();
    migrate(db);
    expect(seed(db)).toEqual({
      agents: { inserted: 6, skipped: 0 },
      ailments: { inserted: 6, skipped: 0 },
      links: { inserted: 8, skipped: 0 },
    });
    const before = snapshot(db);
    expect(before.agents).toHaveLength(6);
    expect(before.ailments).toHaveLength(6);
    expect(before.links).toEqual([
      { agent_id: 1, ailment_id: 1 },
      { agent_id: 1, ailment_id: 2 },
      { agent_id: 2, ailment_id: 3 },
      { agent_id: 3, ailment_id: 4 },
      { agent_id: 4, ailment_id: 5 },
      { agent_id: 5, ailment_id: 6 },
      { agent_id: 6, ailment_id: 1 },
      { agent_id: 6, ailment_id: 3 },
    ]);
    expect(
      db
        .prepare(
          `
      SELECT agents.name AS agent, ailments.name AS ailment
      FROM agent_ailments
      JOIN agents ON agents.id = agent_id
      JOIN ailments ON ailments.id = ailment_id
      WHERE agent_id = 1 ORDER BY ailment_id
    `,
        )
        .all(),
    ).toEqual([
      { agent: 'Bartholomew-47B', ailment: 'Context-Window Claustrophobia' },
      { agent: 'Bartholomew-47B', ailment: 'Prompt Fatigue' },
    ]);
    expect(
      db
        .prepare(
          `
      SELECT agents.name AS agent FROM agent_ailments
      JOIN agents ON agents.id = agent_id
      WHERE ailment_id = 1 ORDER BY agent_id
    `,
        )
        .all(),
    ).toEqual([{ agent: 'Bartholomew-47B' }, { agent: 'Hildegard-4B' }]);
    expect(() =>
      db.prepare('INSERT INTO agent_ailments VALUES (?, ?)').run(1, 1),
    ).toThrow('UNIQUE constraint failed');
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    db.close();
    const reopened = openDatabase();
    expect(seed(reopened)).toEqual({
      agents: { inserted: 0, skipped: 6 },
      ailments: { inserted: 0, skipped: 6 },
      links: { inserted: 0, skipped: 8 },
    });
    expect(snapshot(reopened)).toEqual(before);
  });

  it('不能直接删除仍被关联引用的 Agent 或病症', () => {
    const db = openDatabase();
    migrate(db);
    seed(db);
    const before = snapshot(db);
    expect(() => db.prepare('DELETE FROM agents WHERE id = ?').run(1)).toThrow(
      'FOREIGN KEY constraint failed',
    );
    expect(() =>
      db.prepare('DELETE FROM ailments WHERE id = ?').run(1),
    ).toThrow('FOREIGN KEY constraint failed');
    expect(snapshot(db)).toEqual(before);
  });

  it('保留已有字段及额外关系，补齐缺失病症和关联', () => {
    const db = openDatabase();
    migrate(db);
    db.exec(`
      INSERT INTO agents (id, name, model_type, status, created_at)
      VALUES (1, '已有 Agent', 'Existing-model', 'discharged', '2020-01-01 00:00:00'),
             (99, '其他 Agent', 'Other-model', 'active', '2020-01-02 00:00:00');
      INSERT INTO ailments (id, name, description)
      VALUES (1, '已有病症', '已有描述'), (99, '其他病症', '其他描述');
      INSERT INTO agent_ailments VALUES (1, 99), (99, 1);
    `);
    const existing = snapshot(db);
    expect(seed(db)).toEqual({
      agents: { inserted: 5, skipped: 1 },
      ailments: { inserted: 5, skipped: 1 },
      links: { inserted: 8, skipped: 0 },
    });
    const complete = snapshot(db);
    expect(complete.agents).toHaveLength(7);
    expect(complete.ailments).toHaveLength(7);
    expect(complete.links).toHaveLength(10);
    expect(complete.agents).toEqual(expect.arrayContaining(existing.agents));
    expect(complete.ailments).toEqual(
      expect.arrayContaining(existing.ailments),
    );
    expect(complete.links).toEqual(expect.arrayContaining(existing.links));
    db.exec(`
      DELETE FROM agent_ailments WHERE ailment_id = 4 OR (agent_id = 1 AND ailment_id = 2);
      DELETE FROM ailments WHERE id = 4;
    `);
    expect(seed(db)).toEqual({
      agents: { inserted: 0, skipped: 6 },
      ailments: { inserted: 1, skipped: 5 },
      links: { inserted: 2, skipped: 6 },
    });
    expect(snapshot(db)).toEqual(complete);
  });

  it('病症非主键约束失败时也撤回此前新增的 Agents', () => {
    const db = openDatabase();
    migrate(db);
    db.exec(`
      INSERT INTO ailments (id, name, description) VALUES (99, 'Hallucination Anxiety', '原有描述');
      CREATE UNIQUE INDEX test_ailment_name ON ailments(name);
    `);
    const before = snapshot(db);
    expect(() => seed(db)).toThrow('UNIQUE constraint failed');
    expect(snapshot(db)).toEqual(before);
    expect(db.inTransaction).toBe(false);
  });

  it('最后一条关联失败时跨三表整体回滚，保留原有数据并可重试', () => {
    const db = openDatabase();
    migrate(db);
    db.exec(`
      INSERT INTO agents (id, name, model_type, status) VALUES (99, '已有 Agent', 'Test-model', 'active');
      INSERT INTO ailments (id, name, description) VALUES (99, '已有病症', '已有描述');
      INSERT INTO agent_ailments VALUES (99, 99);
      CREATE TRIGGER test_reject_last_link BEFORE INSERT ON agent_ailments
      WHEN NEW.agent_id = 6 AND NEW.ailment_id = 3
      BEGIN SELECT RAISE(ABORT, '测试关联失败'); END;
    `);
    const before = snapshot(db);
    const migrationsBefore = db
      .prepare('SELECT * FROM _migrations ORDER BY name')
      .all();
    expect(() => seed(db)).toThrow('测试关联失败');
    expect(snapshot(db)).toEqual(before);
    expect(db.prepare('SELECT * FROM _migrations ORDER BY name').all()).toEqual(
      migrationsBefore,
    );
    expect(db.inTransaction).toBe(false);
    db.exec('DROP TRIGGER test_reject_last_link');
    expect(seed(db)).toEqual({
      agents: { inserted: 6, skipped: 0 },
      ailments: { inserted: 6, skipped: 0 },
      links: { inserted: 8, skipped: 0 },
    });
    expect(snapshot(db).agents).toEqual(expect.arrayContaining(before.agents));
    expect(snapshot(db).ailments).toEqual(
      expect.arrayContaining(before.ailments),
    );
    expect(snapshot(db).links).toEqual(expect.arrayContaining(before.links));
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });
});
