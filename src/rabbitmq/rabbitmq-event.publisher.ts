import { Injectable } from '@nestjs/common';

import type { EventEnvelope } from '../events/event-envelope';
import { RabbitMqConnectionService } from './rabbitmq-connection.service';

@Injectable()
export class RabbitMqEventPublisher {
  constructor(private readonly connection: RabbitMqConnectionService) {}

  async publish(event: EventEnvelope): Promise<void> {
    await this.connection.channel.publish(
      this.connection.exchange,
      event.eventType,
      event,
      {
        persistent: true,
        messageId: event.eventId,
        type: event.eventType,
        contentType: 'application/json',
      },
    );
  }
}
