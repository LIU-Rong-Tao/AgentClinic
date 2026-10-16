CREATE TABLE appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id INTEGER NOT NULL REFERENCES agents(id),
  therapy_id INTEGER NOT NULL REFERENCES therapies(id),
  therapist_id TEXT NOT NULL CHECK (therapist_id IN ('ada', 'turing', 'hopper')),
  starts_at INTEGER NOT NULL CHECK (typeof(starts_at) = 'integer' AND starts_at % 1800 = 0),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX appointments_agent_slot ON appointments(agent_id, starts_at) WHERE status = 'scheduled';
CREATE UNIQUE INDEX appointments_therapist_slot ON appointments(therapist_id, starts_at) WHERE status = 'scheduled';
