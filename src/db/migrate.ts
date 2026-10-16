import type Database from 'better-sqlite3';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultDirectory = fileURLToPath(
  new URL('./migrations/', import.meta.url),
);

export function migrate(db: Database.Database, directory = defaultDirectory) {
  const files = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort();

  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  const alreadyApplied = db.prepare('SELECT 1 FROM _migrations WHERE name = ?');
  const record = db.prepare('INSERT INTO _migrations (name) VALUES (?)');
  const apply = db.transaction((name: string, sql: string) => {
    if (alreadyApplied.get(name)) return false;
    db.exec(sql);
    record.run(name);
    return true;
  });

  const applied: string[] = [];
  for (const name of files) {
    try {
      // 先取得写锁，再检查记录；SQL 与记账共同提交或回滚。
      if (apply.immediate(name, readFileSync(join(directory, name), 'utf8'))) {
        applied.push(name);
      }
    } catch (error) {
      throw new Error(`数据库迁移 ${name} 失败`, { cause: error });
    }
  }
  return applied;
}
