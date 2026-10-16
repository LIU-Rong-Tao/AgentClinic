import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import type {
  AgentListItem,
  Ailment,
  Therapy,
  RecommendedTherapy,
} from '../db/types.js';
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
  const selectRecommendations = db.prepare<
    [number],
    Therapy & { ailment_id: number; ailment_name: string }
  >(
    `SELECT t.id, t.name, t.description, al.id AS ailment_id, al.name AS ailment_name
     FROM therapies t
     JOIN ailment_therapies at ON at.therapy_id = t.id
     JOIN ailments al ON al.id = at.ailment_id
     JOIN agent_ailments aa ON aa.ailment_id = al.id
     WHERE aa.agent_id = ? ORDER BY t.name, t.id, al.name, al.id`,
  );
  router.get('/:id', (c) => {
    const rawId = c.req.param('id');
    const id = Number(rawId);
    if (!/^[1-9]\d*$/.test(rawId) || !Number.isSafeInteger(id)) {
      return c.notFound();
    }
    const agent = selectAgent.get(id);
    if (!agent) return c.notFound();
    const recommendations = new Map<number, RecommendedTherapy>();
    for (const row of selectRecommendations.all(id)) {
      let therapy = recommendations.get(row.id);
      if (!therapy) {
        therapy = {
          id: row.id,
          name: row.name,
          description: row.description,
          matchedAilments: [],
        };
        recommendations.set(row.id, therapy);
      }
      therapy.matchedAilments.push({
        id: row.ailment_id,
        name: row.ailment_name,
      });
    }
    return c.html(
      <AgentDetail
        agent={agent}
        ailments={selectAilments.all(id)}
        recommendations={[...recommendations.values()]}
      />,
    );
  });
  return router;
}
