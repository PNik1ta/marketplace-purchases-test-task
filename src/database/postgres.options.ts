import type { DataSourceOptions } from 'typeorm';

import { config } from '../config/config';

type PostgresOptions = Extract<
  DataSourceOptions,
  {
    type: 'postgres';
  }
>;

export const postgresOptions = {
  type: 'postgres',
  host: config.infrastructure.postgres.host,
  port: config.infrastructure.postgres.port,
  username: config.infrastructure.postgres.username,
  password: config.infrastructure.postgres.password,
  database: config.infrastructure.postgres.database,
} satisfies Pick<
  PostgresOptions,
  'type' | 'host' | 'port' | 'username' | 'password' | 'database'
>;
