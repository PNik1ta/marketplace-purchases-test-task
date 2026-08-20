import 'dotenv/config';

import { DataSource } from 'typeorm';

import { config } from '../config/config';

export const dataSource = new DataSource({
  type: 'postgres',

  host: config.infrastructure.postgres.host,
  port: config.infrastructure.postgres.port,
  username: config.infrastructure.postgres.username,
  password: config.infrastructure.postgres.password,
  database: config.infrastructure.postgres.database,

  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],

  synchronize: false,
});

export default dataSource;
