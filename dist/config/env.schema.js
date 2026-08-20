"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnv = exports.envSchema = void 0;
const zod_1 = require("zod");
exports.envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z
        .enum(['development', 'test', 'production'])
        .default('development'),
    PORT: zod_1.z.coerce.number().int().positive().default(3000),
    DB_HOST: zod_1.z.string().min(1),
    DB_PORT: zod_1.z.coerce.number().int().positive(),
    DB_USER: zod_1.z.string().min(1),
    DB_PASSWORD: zod_1.z.string().min(1),
    DB_NAME: zod_1.z.string().min(1),
});
const validateEnv = (config) => exports.envSchema.parse(config);
exports.validateEnv = validateEnv;
//# sourceMappingURL=env.schema.js.map