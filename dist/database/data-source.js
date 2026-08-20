"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataSource = void 0;
require("dotenv/config");
const typeorm_1 = require("typeorm");
exports.dataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: ['src/**/*.entity.ts'],
    migrations: ['src/database/migrations/*.ts'],
    synchronize: false,
});
exports.default = exports.dataSource;
//# sourceMappingURL=data-source.js.map