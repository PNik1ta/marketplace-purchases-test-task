import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OutboxEventEntity } from './entities/outbox-event.entity';
import { OutboxEventRepository } from './repositories/outbox-event.repository';
import { OutboxPublisherWorker } from './workers/outbox-publisher.worker';
import { RabbitMqModule } from '../rabbitmq/rabbitmq.module';

@Module({
  imports: [TypeOrmModule.forFeature([OutboxEventEntity]), RabbitMqModule],
  providers: [OutboxEventRepository, OutboxPublisherWorker],
  exports: [OutboxEventRepository],
})
export class OutboxModule {}
