import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema';

// Disable prefetch as it is not supported for "Transaction" pool mode
export const client = postgres(process.env.POSTGRES_URL!, { prepare: false });
const database = drizzle({ client, schema });

export default database;
