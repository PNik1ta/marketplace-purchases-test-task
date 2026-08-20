import { Module } from '@nestjs/common';

import { RabbitMqConnectionService } from './rabbitmq-connection.service';
import { RabbitMqEventPublisher } from './rabbitmq-event.publisher';
import { RABBITMQ_OPTIONS } from './rabbitmq-options';
import { config } from '../config/config';

@Module({
  providers: [
    {
      provide: RABBITMQ_OPTIONS,
      useValue: config.infrastructure.rabbitmq,
    },
    RabbitMqConnectionService,
    RabbitMqEventPublisher,
  ],
  exports: [RabbitMqEventPublisher],
})
export class RabbitMqModule {}
