/** A nominal/brand helper that keeps structurally identical primitive IDs distinct. */
export type Brand<T, TBrand extends string> = T & {
  readonly __brand: TBrand;
};

export type EntityId = Brand<string, 'EntityId'>;
export type WorkspaceId = Brand<string, 'WorkspaceId'>;
export type UserId = Brand<string, 'UserId'>;
export type EventId = Brand<string, 'EventId'>;
export type CommandId = Brand<string, 'CommandId'>;
export type MutationId = Brand<string, 'MutationId'>;
export type CalculationId = Brand<string, 'CalculationId'>;

/** Server-owned optimistic-concurrency sequence number. Starts at 1. */
export type Revision = Brand<number, 'Revision'>;

/** ISO-8601 UTC timestamp string at system boundaries. */
export type IsoDateTime = Brand<string, 'IsoDateTime'>;
