import { createIngestWorker } from './src/workers/ingest.worker';

const ingestWorker = createIngestWorker();

console.log('cinder started — listening on ingest-queue');

process.on('SIGTERM', async () => {
  await ingestWorker.close();
  process.exit(0);
});
