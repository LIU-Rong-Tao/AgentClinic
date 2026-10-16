import type { MiddlewareHandler } from 'hono';
export type RequestLog = {
  method: string;
  path: string;
  status: number;
  durationMs: number;
};
export type LogSink = (entry: RequestLog) => void;
export const consoleLog: LogSink = (entry) =>
  console.log(JSON.stringify(entry));
export function requestLogger(write: LogSink): MiddlewareHandler {
  return async (c, next) => {
    const start = performance.now();
    await next();
    write({
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
    });
  };
}
