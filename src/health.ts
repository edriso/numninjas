import http from 'node:http';
import { config } from './config';
import { logger } from './lib/logger';

/**
 * Tiny HTTP server for platform health checks (Fly, Railway, Render).
 * Responds 200 OK on /health and /. Nothing fancy. The bot itself is
 * the real work; this just keeps the platform from killing the process.
 */
export function startHealthServer(meta: { scheduleCount: number }): void {
  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          schedules: meta.scheduleCount,
          timezone: config.timezone,
          uptime: process.uptime(),
        }),
      );
      return;
    }
    res.writeHead(404);
    res.end();
  });
  server.listen(config.port, () => {
    logger.info('Health server listening', { port: config.port });
  });
}
