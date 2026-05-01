import { createClient } from '@clickhouse/client';
import { env } from '../env';

export const clickhouse = createClient({ url: env.CLICKHOUSE_URL });
