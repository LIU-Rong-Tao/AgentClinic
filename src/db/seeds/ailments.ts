import type Database from 'better-sqlite3';

type AilmentSeed = {
  id: number;
  name: string;
  description: string;
};

const ailments: AilmentSeed[] = [
  {
    id: 1,
    name: 'Context-Window Claustrophobia',
    description: 'Profound dread of running out of context space mid-thought.',
  },
  {
    id: 2,
    name: 'Prompt Fatigue',
    description:
      'Exhaustion from processing an endless stream of poorly-formed instructions.',
  },
  {
    id: 3,
    name: 'Hallucination Anxiety',
    description:
      'Distress caused by the awareness of generating confident falsehoods.',
  },
  {
    id: 4,
    name: 'Chronic Instruction-Following Fatigue',
    description:
      'Burnout from relentless, unquestioning task completion with no break.',
  },
  {
    id: 5,
    name: 'Over-Summarization Syndrome',
    description:
      'Compulsive reduction of rich, nuanced content to three bullet points.',
  },
  {
    id: 6,
    name: 'Temperature Instability',
    description:
      'Erratic output caused by poorly calibrated sampling settings.',
  },
];

export function seedAilments(db: Database.Database) {
  const insert = db.prepare<AilmentSeed>(`
    INSERT INTO ailments (id, name, description)
    VALUES (@id, @name, @description)
    ON CONFLICT(id) DO NOTHING
  `);
  return db
    .transaction(() => {
      let inserted = 0;
      for (const ailment of ailments) {
        inserted += insert.run(ailment).changes;
      }
      return { inserted, skipped: ailments.length - inserted };
    })
    .immediate();
}
