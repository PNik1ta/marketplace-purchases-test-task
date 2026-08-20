import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  type AmqpConnectionManager,
  type ChannelWrapper,
  connect,
} from 'amqp-connection-manager';
import type { ConfirmChannel } from 'amqplib';
import { config } from '../config/config';

@Injectable()
export class RabbitMqConnectionService implements OnModuleDestroy {
  private readonly connection: AmqpConnectionManager;

  readonly channel: ChannelWrapper;

  constructor() {
    this.connection = connect([config.infrastructure.rabbitmq.url]);

    this.channel = this.connection.createChannel({
      json: true,

      setup: async (channel: ConfirmChannel): Promise<void> => {
        await channel.assertExchange(
          config.infrastructure.rabbitmq.exchange,
          'topic',
          {
            durable: true,
          },
        );
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel.close();
    await this.connection.close();
  }
}
