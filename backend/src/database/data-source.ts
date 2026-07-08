import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm-options';

// Load .env so the migration CLI sees the same config as the running app.
dotenv.config();

/**
 * Standalone DataSource used ONLY by the TypeORM CLI (migration:generate/run/revert).
 * The running Nest app uses DatabaseModule, which shares buildTypeOrmOptions().
 */
export default new DataSource(buildTypeOrmOptions());
