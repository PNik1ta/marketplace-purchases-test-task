import 'dotenv/config';
import { DataSource } from 'typeorm';
import { postgresOptions } from './postgres.options';

const dataSource = new DataSource({
  ...postgresOptions,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});

export default dataSource;
