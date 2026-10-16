import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import type { Ailment } from '../db/types.js';
import { AilmentsList } from '../components/AilmentsList.js';

export function ailmentsRouter(db: Database.Database) {
  const router = new Hono();
  const selectAll = db.prepare<[], Ailment>(
    'SELECT id, name, description FROM ailments ORDER BY name, id',
  );
  router.get('/', (c) => c.html(<AilmentsList ailments={selectAll.all()} />));
  return router;
}
