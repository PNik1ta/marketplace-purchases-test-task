import { envSchema } from './env.schema';
import { Config } from './types/config';

const env = envSchema.parse(process.env);

export const config: Config = {
  app: {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
  },

  infrastructure: {
    postgres: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      username: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
    },
  },
};
