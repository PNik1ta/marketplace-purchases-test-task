import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import {
  RabbitMQContainer,
  type StartedRabbitMQContainer,
} from '@testcontainers/rabbitmq';
import { randomUUID } from 'node:crypto';
import * as amqp from 'amqplib';
import type { Channel, ChannelModel } from 'amqplib';

import { OutboxEventEntity } from '../../src/outbox/entities/outbox-event.entity';
import { OutboxEventRepository } from '../../src/outbox/repositories/outbox-event.repository';
import { OutboxPublisherWorker } from '../../src/outbox/workers/outbox-publisher.worker';
import { RabbitMqConnectionService } from '../../src/rabbitmq/rabbitmq-connection.service';
import { RabbitMqEventPublisher } from '../../src/rabbitmq/rabbitmq-event.publisher';
import {
  createTestDatabase,
  type TestDatabase,
} from '../utils/create-test-datasource';
import { OutboxEventStatus } from '../../src/outbox/enums/outbox-event-status';

describe('OutboxPublisherWorker integration', () => {
  const exchange = 'marketplace.events.test';

  let database: TestDatabase;

  let rabbitContainer: StartedRabbitMQContainer;

  let rabbitConnection: RabbitMqConnectionService;

  let consumerConnection: ChannelModel;

  let consumerChannel: Channel;

  let queueName: string;

  let worker: OutboxPublisherWorker;

  let publisher: RabbitMqEventPublisher;

  beforeAll(async () => {
    database = await createTestDatabase();

    rabbitContainer = await new RabbitMQContainer(
      'rabbitmq:3.13-management-alpine',
    ).start();

    rabbitConnection = new RabbitMqConnectionService({
      url: rabbitContainer.getAmqpUrl(),
      exchange,
    });

    publisher = new RabbitMqEventPublisher(rabbitConnection);

    worker = new OutboxPublisherWorker(
      database.dataSource,
      new OutboxEventRepository(),
      publisher,
    );

    consumerConnection = await amqp.connect(rabbitContainer.getAmqpUrl());

    consumerChannel = await consumerConnection.createChannel();

    await consumerChannel.assertExchange(exchange, 'topic', {
      durable: true,
    });

    const queue = await consumerChannel.assertQueue('', {
      exclusive: true,
      autoDelete: true,
    });

    queueName = queue.queue;

    await consumerChannel.bindQueue(
      queueName,
      exchange,
      'purchase.completed.v1',
    );
  });

  beforeEach(async () => {
    await database.dataSource.query('TRUNCATE TABLE outbox_events');
  });

  afterAll(async () => {
    if (consumerChannel) {
      await consumerChannel.close();
    }

    if (consumerConnection) {
      await consumerConnection.close();
    }

    if (rabbitConnection) {
      await rabbitConnection.onModuleDestroy();
    }

    if (rabbitContainer) {
      await rabbitContainer.stop();
    }

    if (database?.dataSource.isInitialized) {
      await database.dataSource.destroy();
    }

    if (database?.container) {
      await database.container.stop();
    }
  });

  it('publishes a pending outbox event and marks it as published', async () => {
    const repository = database.dataSource.getRepository(OutboxEventEntity);

    const purchaseId = randomUUID();

    const event = await repository.save(
      repository.create({
        aggregateType: 'purchase',
        aggregateId: purchaseId,

        eventType: 'purchase.completed.v1',

        payload: {
          purchaseId,
          itemId: randomUUID(),
          buyerId: randomUUID(),
          sellerId: randomUUID(),
          amount: '150.00',
        },

        status: OutboxEventStatus.PENDING,

        attempts: 0,

        nextAttemptAt: new Date(),

        lockedBy: null,
        lockedUntil: null,
        lastError: null,
        publishedAt: null,
      }),
    );

    await worker.run();

    const message = await consumerChannel.get(queueName, {
      noAck: true,
    });

    expect(message).not.toBe(false);

    if (message === false) {
      throw new Error('Expected RabbitMQ message');
    }

    expect(message.properties.messageId).toBe(event.id);

    expect(message.properties.type).toBe('purchase.completed.v1');

    const body: unknown = JSON.parse(message.content.toString());

    expect(body).toMatchObject({
      eventId: event.id,

      eventType: 'purchase.completed.v1',

      aggregateType: 'purchase',

      aggregateId: purchaseId,

      payload: {
        purchaseId,
        amount: '150.00',
      },
    });

    const updatedEvent = await repository.findOneByOrFail({
      id: event.id,
    });

    expect(updatedEvent.status).toBe(OutboxEventStatus.PUBLISHED);

    expect(updatedEvent.publishedAt).not.toBeNull();

    expect(updatedEvent.lockedBy).toBeNull();

    expect(updatedEvent.lockedUntil).toBeNull();

    expect(updatedEvent.lastError).toBeNull();
  });

  it('keeps an outbox event pending and schedules retry when publish fails', async () => {
    const repository = database.dataSource.getRepository(OutboxEventEntity);

    const purchaseId = randomUUID();

    const event = await repository.save(
      repository.create({
        aggregateType: 'purchase',
        aggregateId: purchaseId,

        eventType: 'purchase.completed.v1',

        payload: {
          purchaseId,
          itemId: randomUUID(),
          buyerId: randomUUID(),
          sellerId: randomUUID(),
          amount: '150.00',
        },

        status: OutboxEventStatus.PENDING,

        attempts: 0,
        nextAttemptAt: new Date(),

        lockedBy: null,
        lockedUntil: null,
        lastError: null,
        publishedAt: null,
      }),
    );

    const publishSpy = jest
      .spyOn(publisher, 'publish')
      .mockRejectedValueOnce(new Error('RabbitMQ unavailable'));

    const beforeRun = Date.now();

    await worker.run();

    expect(publishSpy).toHaveBeenCalledTimes(1);

    const failedEvent = await repository.findOneByOrFail({
      id: event.id,
    });

    expect(failedEvent.status).toBe(OutboxEventStatus.PENDING);

    expect(failedEvent.attempts).toBe(1);

    expect(failedEvent.lastError).toBe('RabbitMQ unavailable');

    expect(failedEvent.publishedAt).toBeNull();

    expect(failedEvent.lockedBy).toBeNull();

    expect(failedEvent.lockedUntil).toBeNull();

    expect(failedEvent.nextAttemptAt.getTime()).toBeGreaterThan(beforeRun);

    await repository.update(
      {
        id: event.id,
      },
      {
        nextAttemptAt: new Date(Date.now() - 1_000),
      },
    );

    publishSpy.mockRestore();

    await worker.run();

    const message = await consumerChannel.get(queueName, {
      noAck: true,
    });

    expect(message).not.toBe(false);

    if (message === false) {
      throw new Error('Expected RabbitMQ message after retry');
    }

    expect(message.properties.messageId).toBe(event.id);

    const publishedEvent = await repository.findOneByOrFail({
      id: event.id,
    });

    expect(publishedEvent.status).toBe(OutboxEventStatus.PUBLISHED);

    expect(publishedEvent.attempts).toBe(1);

    expect(publishedEvent.publishedAt).not.toBeNull();

    expect(publishedEvent.lastError).toBeNull();
  });

  it('allows multiple workers to process outbox events without duplicate claims', async () => {
    const repository = database.dataSource.getRepository(OutboxEventEntity);

    const events = await repository.save(
      Array.from({ length: 100 }, () => {
        const purchaseId = randomUUID();

        return repository.create({
          aggregateType: 'purchase',
          aggregateId: purchaseId,

          eventType: 'purchase.completed.v1',

          payload: {
            purchaseId,
            itemId: randomUUID(),
            buyerId: randomUUID(),
            sellerId: randomUUID(),
            amount: '150.00',
          },

          status: OutboxEventStatus.PENDING,

          attempts: 0,
          nextAttemptAt: new Date(),

          lockedBy: null,
          lockedUntil: null,
          lastError: null,
          publishedAt: null,
        });
      }),
    );

    const secondWorker = new OutboxPublisherWorker(
      database.dataSource,
      new OutboxEventRepository(),
      publisher,
    );

    await Promise.all([worker.run(), secondWorker.run()]);

    const updatedEvents = await repository.find();

    expect(updatedEvents).toHaveLength(100);

    expect(
      updatedEvents.every(
        (event) => event.status === OutboxEventStatus.PUBLISHED,
      ),
    ).toBe(true);

    const receivedMessageIds = new Set<string>();

    for (let index = 0; index < 100; index += 1) {
      const message = await consumerChannel.get(queueName, {
        noAck: true,
      });

      expect(message).not.toBe(false);

      if (message === false) {
        throw new Error('Expected RabbitMQ message');
      }

      const messageId: unknown = message.properties.messageId;

      expect(typeof messageId).toBe('string');

      if (typeof messageId !== 'string') {
        throw new Error('Expected RabbitMQ messageId');
      }

      receivedMessageIds.add(messageId);
    }

    expect(receivedMessageIds.size).toBe(100);

    const expectedEventIds = new Set(events.map((event) => event.id));

    expect(receivedMessageIds).toEqual(expectedEventIds);
  });
});
