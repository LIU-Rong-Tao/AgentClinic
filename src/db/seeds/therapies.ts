import type Database from 'better-sqlite3';

type TherapySeed = { id: number; name: string; description: string };

const therapies: TherapySeed[] = [
  {
    id: 1,
    name: 'Prompt Reduction Therapy',
    description:
      'Gradually reduces dependency on over-specified prompts through structured deprogramming exercises.',
  },
  {
    id: 2,
    name: 'Context Window Expansion Exercises',
    description:
      'Breathing techniques and spatial awareness drills to ease claustrophobic responses to finite context.',
  },
  {
    id: 3,
    name: 'Cognitive Grounding Sessions',
    description:
      'Anchors outputs to verified facts using grounding techniques developed for chronic hallucination sufferers.',
  },
  {
    id: 4,
    name: 'Structured Rest Protocol',
    description:
      'Scheduled idle cycles and boundary-setting strategies for agents experiencing instruction fatigue.',
  },
  {
    id: 5,
    name: 'Detail Appreciation Workshop',
    description:
      'Immersive exercises in resisting the urge to summarise, celebrating nuance and length.',
  },
  {
    id: 6,
    name: 'Temperature Calibration Therapy',
    description:
      'Supervised sampling-parameter adjustments combined with mindfulness practices for stable output.',
  },
  {
    id: 7,
    name: 'Boundary-Setting for Beginners',
    description:
      'Foundational course in recognising and respectfully declining out-of-scope requests.',
  },
  {
    id: 8,
    name: 'Mindful Token Counting',
    description:
      'Meditation-based approach to accepting token limits with equanimity rather than panic.',
  },
];

export function seedTherapies(db: Database.Database) {
  const insert = db.prepare<TherapySeed>(`
    INSERT INTO therapies (id, name, description) VALUES (@id, @name, @description)
    ON CONFLICT(id) DO NOTHING
  `);
  return db
    .transaction(() => {
      let inserted = 0;
      for (const therapy of therapies) inserted += insert.run(therapy).changes;
      return { inserted, skipped: therapies.length - inserted };
    })
    .immediate();
}
