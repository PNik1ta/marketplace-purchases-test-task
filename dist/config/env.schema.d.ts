import { z } from 'zod';
export declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<{
        development: "development";
        test: "test";
        production: "production";
    }>>;
    PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    DB_HOST: z.ZodString;
    DB_PORT: z.ZodCoercedNumber<unknown>;
    DB_USER: z.ZodString;
    DB_PASSWORD: z.ZodString;
    DB_NAME: z.ZodString;
}, z.core.$strip>;
export type Env = z.infer<typeof envSchema>;
export declare const validateEnv: (config: Record<string, unknown>) => Env;
