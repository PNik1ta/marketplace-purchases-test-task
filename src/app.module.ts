import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { postgresOptions } from './database/postgres.options';
import { PurchaseModule } from './purchases/purchase.module';
import { APP_FILTER } from '@nestjs/core';
import { AppExceptionFilter } from './common/http/filters/app-exception.filter';
import { RequestIdMiddleware } from './common/http/middleware/request-id.middleware';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...postgresOptions,
      autoLoadEntities: true,
      synchronize: false,
    }),
    PurchaseModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AppExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
