import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';

describe('未实现的资源', () => {
  it.each(['/agents', '/missing.css'])(
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
