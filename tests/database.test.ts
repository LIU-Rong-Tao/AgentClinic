import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb } from '../src/db/index.js';
import { migrate } from '../src/db/migrate.js';

const workRoot = fileURLToPath(new URL('../work', import.meta.url));
let temporaryDirectory: string;
let migrationsDirectory: string;
let databases: ReturnType<typeof createDb>[];

function openDatabase() {
  const db = createDb(join(temporaryDirectory, 'test.db'));
  databases.push(db);
  return db;
}

function migration(name: string, sql: string) {
  writeFileSync(join(migrationsDirectory, name), sql, 'utf8');
}

beforeEach(() => {
  mkdirSync(workRoot, { recursive: true });
  temporaryDirectory = mkdtempSync(join(workRoot, 'db-tests-'));
  migrationsDirectory = join(temporaryDirectory, 'migrations');
  mkdirSync(migrationsDirectory);
  databases = [];
});

afterEach(() => {
  for (const db of databases) {
    if (db.open) db.close();
  }
  if (
    dirname(temporaryDirectory) !== workRoot ||
    !basename(temporaryDirectory).startsWith('db-tests-')
  ) {
    throw new Error('测试清理路径超出当前项目的临时目录');
  }
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('SQLite 初始化与迁移', () => {
  it('空迁移目录只创建可持久保存的迁移记录表', () => {
    const db = openDatabase();
    migrate(db, migrationsDirectory);
    db.close();
    const reopened = openDatabase();
    expect(
      reopened
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all(),
    ).toEqual([{ name: '_migrations' }]);
    expect(reopened.prepare('SELECT * FROM _migrations').all()).toEqual([]);
  });

  it('按序执行、跨连接跳过已应用文件，并只应用追加文件', () => {
    migration('002_insert.sql', "INSERT INTO events (value) VALUES ('first');");
    migration('001_create.sql', 'CREATE TABLE events (value TEXT NOT NULL);');
    migration('notes.txt', '这不是 SQL，不能执行');
    const db = openDatabase();
    migrate(db, migrationsDirectory);
    migrate(db, migrationsDirectory);
    expect(db.prepare('SELECT value FROM events').all()).toEqual([
      { value: 'first' },
    ]);
    db.close();

    const reopened = openDatabase();
    migration(
      '003_append.sql',
      "INSERT INTO events (value) VALUES ('second');",
    );
    migrate(reopened, migrationsDirectory);
    expect(
      reopened.prepare('SELECT value FROM events ORDER BY rowid').all(),
    ).toEqual([{ value: 'first' }, { value: 'second' }]);
    expect(
      reopened.prepare('SELECT name FROM _migrations ORDER BY rowid').all(),
    ).toEqual([
      { name: '001_create.sql' },
      { name: '002_insert.sql' },
      { name: '003_append.sql' },
    ]);
    expect(
      reopened.prepare('SELECT applied_at FROM _migrations').all(),
    ).toEqual([
      { applied_at: expect.any(String) },
      { applied_at: expect.any(String) },
      { applied_at: expect.any(String) },
    ]);
  });

  it('失败文件整体回滚并阻断后续文件，修复后可以继续', () => {
    migration('001_create.sql', 'CREATE TABLE events (value TEXT NOT NULL);');
    migration(
      '002_broken.sql',
      'CREATE TABLE partial (id INTEGER); INSERT INTO missing_table VALUES (1);',
    );
    migration('003_later.sql', "INSERT INTO events (value) VALUES ('later');");
    const db = openDatabase();
    expect(() => migrate(db, migrationsDirectory)).toThrow('002_broken.sql');
    expect(
      db.prepare("SELECT name FROM sqlite_master WHERE name = 'partial'").get(),
    ).toBeUndefined();
    expect(db.prepare('SELECT value FROM events').all()).toEqual([]);
    expect(db.prepare('SELECT name FROM _migrations').all()).toEqual([
      { name: '001_create.sql' },
    ]);

    migration('002_broken.sql', 'CREATE TABLE partial (id INTEGER);');
    migrate(db, migrationsDirectory);
    expect(db.prepare('SELECT value FROM events').all()).toEqual([
      { value: 'later' },
    ]);
    expect(
      db.prepare('SELECT COUNT(*) AS count FROM _migrations').get(),
    ).toEqual({ count: 3 });
  });

  it('成功记录无法写入时，也回滚该文件的结构变化', () => {
    const db = openDatabase();
    migrate(db, migrationsDirectory);
    db.exec(
      "CREATE TRIGGER reject_record BEFORE INSERT ON _migrations BEGIN SELECT RAISE(ABORT, 'test record failure'); END;",
    );
    migration('001_create.sql', 'CREATE TABLE partial (id INTEGER);');
    expect(() => migrate(db, migrationsDirectory)).toThrow('001_create.sql');
    expect(
      db.prepare("SELECT name FROM sqlite_master WHERE name = 'partial'").get(),
    ).toBeUndefined();
    expect(db.prepare('SELECT * FROM _migrations').all()).toEqual([]);
  });

  it('连接启用外键约束，拒绝不存在的关联记录', () => {
    const db = openDatabase();
    db.exec(
      'CREATE TABLE parents (id INTEGER PRIMARY KEY); CREATE TABLE children (parent_id INTEGER REFERENCES parents(id));',
    );
    expect(() =>
      db.prepare('INSERT INTO children (parent_id) VALUES (?)').run(99),
    ).toThrow('FOREIGN KEY constraint failed');
    expect(db.prepare('SELECT * FROM children').all()).toEqual([]);
  });

  it('迁移目录缺失时报错，不能当作空目录继续', () => {
    const db = openDatabase();
    expect(() => migrate(db, join(temporaryDirectory, 'missing'))).toThrow();
    expect(
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all(),
    ).toEqual([]);
  });
});
