export interface EventEnvelope<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  eventId: string;
  eventType: string;
  occurredAt: string;

  aggregateType: string;
  aggregateId: string;

  payload: T;
}
