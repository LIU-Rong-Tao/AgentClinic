import type Database from 'better-sqlite3';
export type FeedbackValues = {
  nickname: string;
  message: string;
  rating: string;
};
export type FeedbackErrors = Partial<Record<keyof FeedbackValues, string>>;
export function saveFeedback(
  db: Database.Database,
  input: Record<string, unknown>,
) {
  const values: FeedbackValues = {
    nickname: typeof input.nickname === 'string' ? input.nickname : '',
    message: typeof input.message === 'string' ? input.message : '',
    rating: typeof input.rating === 'string' ? input.rating : '',
  };
  const nickname = values.nickname.trim(),
    message = values.message.trim();
  const errors: FeedbackErrors = {};
  if (!nickname || nickname.length > 50)
    errors.nickname = '请输入 1～50 个字符的昵称。';
  if (!message || message.length > 2000)
    errors.message = '请输入 1～2000 个字符的反馈内容。';
  if (!/^[1-5]$/.test(values.rating))
    errors.rating = '请选择 1～5 的整数评分。';
  if (Object.keys(errors).length) return { ok: false as const, values, errors };
  const result = db
    .prepare('INSERT INTO feedback(nickname,message,rating) VALUES(?,?,?)')
    .run(nickname, message, Number(values.rating));
  return { ok: true as const, id: Number(result.lastInsertRowid) };
}
