import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb } from '../src/db/index.js';
import { migrate } from '../src/db/migrate.js';
import { seedAgents } from '../src/db/seeds/agents.js';

const workRoot = fileURLToPath(new URL('../work', import.meta.url));
let temporaryDirectory: string;
let databases: ReturnType<typeof createDb>[];

function openDatabase() {
  const db = createDb(join(temporaryDirectory, 'agents.db'));
  databases.push(db);
  return db;
}

beforeEach(() => {
  mkdirSync(workRoot, { recursive: true });
  temporaryDirectory = mkdtempSync(join(workRoot, 'agents-tests-'));
  databases = [];
});

afterEach(() => {
  for (const db of databases) {
    if (db.open) db.close();
  }
  if (
    dirname(temporaryDirectory) !== workRoot ||
    !basename(temporaryDirectory).startsWith('agents-tests-')
  ) {
    throw new Error('测试清理路径超出当前项目的临时目录');
  }
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Agents 表与示例数据', () => {
  it('真实迁移建立课程字段，重复执行安全且不自动填数据', () => {
    const db = openDatabase();
    migrate(db);
    migrate(db);
    const columns = db
      .prepare<[], { name: string }>('PRAGMA table_info(agents)')
      .all();
    expect(columns.map((column) => column.name)).toEqual([
      'id',
      'name',
      'model_type',
      'status',
      'created_at',
    ]);
    expect(db.prepare('SELECT * FROM agents').all()).toEqual([]);
    expect(db.prepare('SELECT name FROM _migrations').all()).toContainEqual({
      name: '001_create_agents.sql',
    });
  });

  it.each([
    ['name', null],
    ['model_type', null],
    ['status', null],
    ['created_at', null],
    ['status', 'unknown'],
  ])('拒绝无效字段 %s=%s 且不留下记录', (field, value) => {
    const db = openDatabase();
    migrate(db);
    const record = {
      name: 'Validation fixture',
      model_type: 'Test-model',
      status: 'active',
      created_at: '2026-01-01 00:00:00',
      [field!]: value,
    };
    const insert = db.prepare(
      'INSERT INTO agents (name, model_type, status, created_at) VALUES (@name, @model_type, @status, @created_at)',
    );
    expect(() => insert.run(record)).toThrow(/constraint failed/i);
    expect(db.prepare('SELECT * FROM agents').all()).toEqual([]);
  });

  it('填入六个示例，重开数据库后再次执行保持内容与创建时间', () => {
    const db = openDatabase();
    migrate(db);
    expect(seedAgents(db)).toEqual({ inserted: 6, skipped: 0 });
    const before = db.prepare('SELECT * FROM agents ORDER BY id').all();
    expect(before).toHaveLength(6);
    expect(before).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
          name: 'Bartholomew-47B',
          model_type: 'GPT-47B',
          status: 'active',
        }),
        expect.objectContaining({ status: 'on_leave' }),
        expect.objectContaining({ status: 'discharged' }),
      ]),
    );
    expect(
      db
        .prepare(
          'SELECT COUNT(*) AS count FROM agents WHERE datetime(created_at) IS NOT NULL',
        )
        .get(),
    ).toEqual({ count: 6 });
    db.close();
    const reopened = openDatabase();
    expect(seedAgents(reopened)).toEqual({ inserted: 0, skipped: 6 });
    expect(reopened.prepare('SELECT * FROM agents ORDER BY id').all()).toEqual(
      before,
    );
  });

  it('保留已有 ID 和其他记录，并补齐缺失示例', () => {
    const db = openDatabase();
    migrate(db);
    db.exec(
      "INSERT INTO agents (id, name, model_type, status, created_at) VALUES (1, 'Existing agent', 'Existing model', 'discharged', '2020-01-01 00:00:00'), (99, 'Unrelated agent', 'Other model', 'active', '2020-01-02 00:00:00');",
    );
    const existing = db.prepare('SELECT * FROM agents ORDER BY id').all();
    expect(seedAgents(db)).toEqual({ inserted: 5, skipped: 1 });
    expect(
      db.prepare('SELECT * FROM agents WHERE id IN (1, 99) ORDER BY id').all(),
    ).toEqual(existing);
    db.prepare('DELETE FROM agents WHERE id = ?').run(3);
    expect(seedAgents(db)).toEqual({ inserted: 1, skipped: 5 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM agents').get()).toEqual({
      count: 7,
    });
    expect(
      db.prepare('SELECT * FROM agents WHERE id IN (1, 99) ORDER BY id').all(),
    ).toEqual(existing);
  });

  it('非 ID 约束冲突会报错并回滚本批新增记录', () => {
    const db = openDatabase();
    migrate(db);
    db.exec(
      "INSERT INTO agents (id, name, model_type, status) VALUES (99, 'Existing agent', 'Test-model', 'discharged'); CREATE UNIQUE INDEX test_unique_status ON agents(status);",
    );
    const existing = db.prepare('SELECT * FROM agents').all();
    expect(() => seedAgents(db)).toThrow('UNIQUE constraint failed');
    expect(db.prepare('SELECT * FROM agents').all()).toEqual(existing);
    db.exec('DROP INDEX test_unique_status');
    expect(seedAgents(db)).toEqual({ inserted: 6, skipped: 0 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM agents').get()).toEqual({
      count: 7,
    });
  });
});
