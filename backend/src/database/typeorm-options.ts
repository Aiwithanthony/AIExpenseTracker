import { DataSourceOptions } from 'typeorm';
import { join } from 'path';
import { ALL_ENTITIES } from './entities';

/**
 * Builds TypeORM connection options from environment variables. Shared by the
 * Nest DatabaseModule and the standalone migration CLI (data-source.ts) so both
 * always agree on entities, migrations, and schema-sync behaviour.
 *
 * `synchronize` is controlled explicitly by DB_SYNCHRONIZE (true/false). If unset
 * it defaults to true only in development. In production leave it false and rely
 * on migrations — `migrationsRun` applies pending migrations automatically on boot
 * whenever synchronize is off.
 */
export function buildTypeOrmOptions(
  env: NodeJS.ProcessEnv = process.env,
): DataSourceOptions {
  const dbType = env.DB_TYPE || 'sqlite';
  const isDev = (env.NODE_ENV || 'development') === 'development';
  const synchronize =
    env.DB_SYNCHRONIZE != null ? env.DB_SYNCHRONIZE === 'true' : isDev;
  const logging = isDev;

  // Migration files live next to this file. Glob covers both .ts (ts-node CLI)
  // and .js (compiled runtime).
  const migrations = [join(__dirname, 'migrations', '*.{ts,js}')];
  // Only auto-run migrations when we're NOT letting TypeORM sync the schema.
  const migrationsRun = !synchronize;

  if (dbType === 'sqlite') {
    return {
      type: 'better-sqlite3',
      database: join(process.cwd(), 'data', 'expense_tracker.db'),
      entities: ALL_ENTITIES,
      migrations,
      migrationsRun,
      synchronize,
      logging,
    };
  }

  const databaseUrl = env.DATABASE_URL;
  if (databaseUrl) {
    const url = new URL(databaseUrl);
    const sslMode = url.searchParams.get('sslmode');
    const ssl =
      sslMode === 'require' || sslMode === 'prefer'
        ? { rejectUnauthorized: false } // Neon and most cloud providers
        : false;

    return {
      type: 'postgres',
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.slice(1),
      ...(env.DB_SCHEMA ? { schema: env.DB_SCHEMA } : {}),
      ssl,
      entities: ALL_ENTITIES,
      migrations,
      migrationsRun,
      synchronize,
      logging,
    };
  }

  return {
    type: 'postgres',
    host: env.DB_HOST || 'localhost',
    port: parseInt(env.DB_PORT || '5432', 10),
    username: env.DB_USERNAME || 'postgres',
    password: env.DB_PASSWORD || 'postgres',
    database: env.DB_NAME || 'expense_tracker',
    ...(env.DB_SCHEMA ? { schema: env.DB_SCHEMA } : {}),
    entities: ALL_ENTITIES,
    migrations,
    migrationsRun,
    synchronize,
    logging,
  };
}
