import { beforeEach, afterEach, it, expect } from 'vitest';
import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createDb } from '../src/db/index.js';
import { migrate } from '../src/db/migrate.js';
import { seed } from '../src/db/seed.js';
import { saveFeedback } from '../src/db/feedback.js';
let db: ReturnType<typeof createDb>;
beforeEach(() => {
  db = createDb(':memory:');
});
afterEach(() => db.close());
const valid = { nickname: '体验者', message: '页面很好', rating: '5' };
it('旧六表升级只新增反馈表，保留已有数据，重复迁移和 seed 不填反馈', () => {
  db.exec(
    'CREATE TABLE _migrations(name TEXT PRIMARY KEY,applied_at TEXT DEFAULT CURRENT_TIMESTAMP)',
  );
  for (const name of readdirSync('src/db/migrations')
    .filter((n) => n.endsWith('.sql') && !n.startsWith('007'))
    .sort()) {
    db.exec(readFileSync(join('src/db/migrations', name), 'utf8'));
    db.prepare('INSERT INTO _migrations(name) VALUES(?)').run(name);
  }
  seed(db);
  db.exec(
    "INSERT INTO appointments(agent_id,therapy_id,therapist_id,starts_at) VALUES(1,1,'ada',1925085600)",
  );
  const snapshot = () =>
    [
      'agents',
      'ailments',
      'agent_ailments',
      'therapies',
      'ailment_therapies',
      'appointments',
    ].map((t) => db.prepare(`SELECT * FROM ${t}`).all());
  const before = snapshot();
  expect(migrate(db)).toEqual(['007_feedback.sql']);
  expect(migrate(db)).toEqual([]);
  seed(db);
  expect(snapshot()).toEqual(before);
  expect(db.prepare('SELECT * FROM feedback').all()).toEqual([]);
});
it('保存规范化文本、原始特殊字符、内部换行、整数评分及 UTC 时间', () => {
  migrate(db);
  const before = Date.now();
  const r = saveFeedback(db, {
    nickname: ' 体验者 ',
    message: '  <b>文字</b>\n第二行  ',
    rating: '3',
  });
  expect(r.ok).toBe(true);
  const row = db.prepare('SELECT * FROM feedback').get() as {
    nickname: string;
    message: string;
    rating: number;
    created_at: string;
  };
  expect(row.nickname).toBe('体验者');
  expect(row.message).toBe('<b>文字</b>\n第二行');
  expect(row.rating).toBe(3);
  expect(Date.parse(row.created_at)).toBeGreaterThanOrEqual(before - 1000);
  expect(Date.parse(row.created_at)).toBeLessThanOrEqual(Date.now() + 1000);
});
it('UTF-16 长度边界支持汉字和表情，超限及不明确输入不写入并保留回填值', () => {
  migrate(db);
  for (const nickname of ['字'.repeat(50), '😀'.repeat(25)])
    expect(
      saveFeedback(db, { ...valid, nickname, message: '字'.repeat(2000) }).ok,
    ).toBe(true);
  const count = () => db.prepare('SELECT count(*) AS n FROM feedback').get();
  const before = count();
  for (const fields of [
    { nickname: '字'.repeat(51) },
    { nickname: '😀'.repeat(26) },
    { message: '字'.repeat(2001) },
    { message: '😀'.repeat(1001) },
    { nickname: '　 \n' },
    { message: ' \t' },
    { nickname: ['a', 'b'] },
    { rating: ['1', '2'] },
    { message: undefined },
  ])
    expect(saveFeedback(db, { ...valid, ...fields }).ok).toBe(false);
  expect(count()).toEqual(before);
  const r = saveFeedback(db, { ...valid, nickname: '  ', message: '保留内容' });
  expect(r.ok).toBe(false);
  if (!r.ok) {
    expect(r.values.message).toBe('保留内容');
    expect(r.errors.nickname).toBeDefined();
  }
});
it('严格评分与数据库约束', () => {
  migrate(db);
  for (const rating of ['', '0', '6', '1.5', '1e0', '01', ' 1', 'NaN'])
    expect(saveFeedback(db, { ...valid, rating }).ok).toBe(false);
  for (const rating of ['1', '2', '3', '4', '5'])
    expect(saveFeedback(db, { ...valid, rating }).ok).toBe(true);
  expect(() =>
    db
      .prepare('INSERT INTO feedback(nickname,message,rating) VALUES(?,?,?)')
      .run('x', 'y', 1.5),
  ).toThrow();
  expect(() =>
    db
      .prepare('INSERT INTO feedback(nickname,message,rating) VALUES(?,?,?)')
      .run(null, 'y', 1),
  ).toThrow();
});
it('关闭重新打开后反馈保持不变', () => {
  const folder = mkdtempSync(resolve('work/feedback-test-'));
  let fileDb = createDb(join(folder, 'test.db'));
  try {
    migrate(fileDb);
    saveFeedback(fileDb, valid);
    const before = fileDb.prepare('SELECT * FROM feedback').all();
    fileDb.close();
    fileDb = createDb(join(folder, 'test.db'));
    expect(fileDb.prepare('SELECT * FROM feedback').all()).toEqual(before);
  } finally {
    fileDb.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
