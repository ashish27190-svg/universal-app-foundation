import type { EntityId, EventId, IsoDateTime, UserId, WorkspaceId } from './ids';

export type ActorType = 'user' | 'system' | 'agent' | 'integration';

export interface EventActor {
  readonly type: ActorType;
  readonly userId?: UserId;
  readonly actorId?: string;
}

export interface DomainEvent<TPayload = Readonly<Record<string, unknown>>> {
  readonly eventId: EventId;
  readonly type: string;
  readonly occurredAt: IsoDateTime;
  readonly workspaceId: WorkspaceId;
  readonly actor: EventActor;
  readonly entityType?: string;
  readonly entityId?: EntityId;
  readonly payload: TPayload;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
