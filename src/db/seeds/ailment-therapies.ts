import type Database from 'better-sqlite3';

const links: [number, number][] = [
  [1, 2],
  [1, 8],
  [2, 1],
  [2, 7],
  [3, 3],
  [4, 4],
  [4, 7],
  [5, 5],
  [6, 6],
];

export function seedAilmentTherapies(db: Database.Database) {
  const insert = db.prepare<[number, number]>(`
    INSERT INTO ailment_therapies (ailment_id, therapy_id) VALUES (?, ?)
    ON CONFLICT(ailment_id, therapy_id) DO NOTHING
  `);
  return db
    .transaction(() => {
      let inserted = 0;
      for (const [ailmentId, therapyId] of links)
        inserted += insert.run(ailmentId, therapyId).changes;
      return { inserted, skipped: links.length - inserted };
    })
    .immediate();
}
