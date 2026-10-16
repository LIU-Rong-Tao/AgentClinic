import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createDb } from '../src/db/index.js';
import { migrate } from '../src/db/migrate.js';

const db = createDb(':memory:');
migrate(db);
const app = createApp(db);
afterAll(() => db.close());

describe('不存在的记录或资源', () => {
  it.each(['/agents/1', '/ailments/1', '/missing.css', '/vendor/package.json'])(
    '%s 不应伪装成成功首页',
    async (path) => {
      const response = await app.request(path);
      expect(response.status).toBe(404);
      expect(await response.text()).not.toContain(
        'AgentClinic is open for business',
      );
    },
  );
});
