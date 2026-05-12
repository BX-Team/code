import { writeFileSync } from 'node:fs';
import { createIngestWorker } from './src/workers/ingest.worker';

const HEALTH_FILE = '/tmp/cinder.health';
const heartbeat = () => writeFileSync(HEALTH_FILE, Math.floor(Date.now() / 1000).toString());

const ingestWorker = createIngestWorker();

heartbeat();
setInterval(heartbeat, 15_000);

console.log('cinder started — listening on ingest-queue');

process.on('SIGTERM', async () => {
  await ingestWorker.close();
  process.exit(0);
});
