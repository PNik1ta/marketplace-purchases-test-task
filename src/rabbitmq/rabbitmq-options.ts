export interface RabbitMqOptions {
  url: string;
  exchange: string;
}

export const RABBITMQ_OPTIONS = Symbol('RABBITMQ_OPTIONS');
