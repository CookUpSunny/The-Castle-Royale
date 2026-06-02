import { createServer } from 'http';
import app from './app.js';
import { initSocketGame } from './lib/socketGame.js';
import { logger } from './lib/logger.js';

const rawPort = process.env['PORT'];

if (!rawPort) {
  throw new Error('PORT environment variable is required but was not provided.');
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

httpServer.on('error', (err) => {
  logger.error({ err }, 'Server error');
  process.exit(1);
});

initSocketGame(httpServer);

httpServer.listen(port, () => {
  logger.info({ port }, 'Server listening');
});
