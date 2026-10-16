import Database from 'better-sqlite3';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

export function createDb(path = 'agentclinic.db') {
  const databasePath = path === ':memory:' ? path : resolve(projectRoot, path);
  const db = new Database(databasePath);
  try {
    db.pragma('foreign_keys = ON');
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
