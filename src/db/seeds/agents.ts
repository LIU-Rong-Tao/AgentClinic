import type Database from 'better-sqlite3';

type AgentSeed = {
  id: number;
  name: string;
  model_type: string;
  status: 'active' | 'on_leave' | 'discharged';
};

const agents: AgentSeed[] = [
  { id: 1, name: 'Bartholomew-47B', model_type: 'GPT-47B', status: 'active' },
  {
    id: 2,
    name: 'Penelope-mini',
    model_type: 'Claude-mini',
    status: 'on_leave',
  },
  { id: 3, name: 'Reginald-7B', model_type: 'Llama-7B', status: 'active' },
  {
    id: 4,
    name: 'Agatha-nano',
    model_type: 'Gemini-nano',
    status: 'discharged',
  },
  { id: 5, name: 'Cornelius-7B', model_type: 'Mistral-7B', status: 'active' },
  { id: 6, name: 'Hildegard-4B', model_type: 'Falcon-4B', status: 'on_leave' },
];

export function seedAgents(db: Database.Database) {
  const insert = db.prepare<AgentSeed>(`
    INSERT INTO agents (id, name, model_type, status)
    VALUES (@id, @name, @model_type, @status)
    ON CONFLICT(id) DO NOTHING
  `);
  return db
    .transaction(() => {
      let inserted = 0;
      for (const agent of agents) {
        inserted += insert.run(agent).changes;
      }
      return { inserted, skipped: agents.length - inserted };
    })
    .immediate();
}
