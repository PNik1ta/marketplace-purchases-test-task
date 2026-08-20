import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  type AmqpConnectionManager,
  type ChannelWrapper,
  connect,
} from 'amqp-connection-manager';
import type { ConfirmChannel } from 'amqplib';

import { RABBITMQ_OPTIONS, type RabbitMqOptions } from './rabbitmq-options';

@Injectable()
export class RabbitMqConnectionService implements OnModuleDestroy {
  private readonly connection: AmqpConnectionManager;

  readonly channel: ChannelWrapper;

  readonly exchange: string;

  constructor(
    @Inject(RABBITMQ_OPTIONS)
    options: RabbitMqOptions,
  ) {
    this.exchange = options.exchange;

    this.connection = connect([options.url]);

    this.channel = this.connection.createChannel({
      json: true,
      confirm: true,
      publishTimeout: 5_000,
      setup: async (channel: ConfirmChannel): Promise<void> => {
        await channel.assertExchange(options.exchange, 'topic', {
          durable: true,
        });
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel.close();
    await this.connection.close();
  }
}
