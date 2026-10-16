import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import type { AgentListItem, Ailment } from '../db/types.js';
import { AgentsList } from '../components/AgentsList.js';
import { AgentDetail } from '../components/AgentDetail.js';

export function agentsRouter(db: Database.Database) {
  const router = new Hono();
  const selectAll = db.prepare<[], AgentListItem>(
    'SELECT id, name, model_type, status FROM agents ORDER BY name, id',
  );
  router.get('/', (c) => c.html(<AgentsList agents={selectAll.all()} />));
  const selectAgent = db.prepare<[number], AgentListItem>(
    'SELECT id, name, model_type, status FROM agents WHERE id = ?',
  );
  const selectAilments = db.prepare<[number], Ailment>(
    `SELECT al.id, al.name, al.description FROM ailments al
     JOIN agent_ailments aa ON al.id = aa.ailment_id
     WHERE aa.agent_id = ? ORDER BY al.name, al.id`,
  );
  router.get('/:id', (c) => {
    const rawId = c.req.param('id');
    const id = Number(rawId);
    if (!/^[1-9]\d*$/.test(rawId) || !Number.isSafeInteger(id)) {
      return c.notFound();
    }
    const agent = selectAgent.get(id);
    if (!agent) return c.notFound();
    return c.html(
      <AgentDetail agent={agent} ailments={selectAilments.all(id)} />,
    );
  });
  return router;
}
