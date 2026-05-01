import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../env';

// BullMQ needs its own dedicated connection (uses blocking commands)
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const ingestQueue = new Queue('ingest-queue', { connection });
