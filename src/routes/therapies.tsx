import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import type { Therapy } from '../db/types.js';
import { TherapiesList } from '../components/TherapiesList.js';

export function therapiesRouter(db: Database.Database) {
  const router = new Hono();
  const selectAll = db.prepare<[], Therapy>(
    'SELECT id, name, description FROM therapies ORDER BY name, id',
  );
  router.get('/', (c) => c.html(<TherapiesList therapies={selectAll.all()} />));
  return router;
}
