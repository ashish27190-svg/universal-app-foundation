import type { CommandId, EntityId, IsoDateTime, Revision, UserId, WorkspaceId } from './ids';

export interface CommandContext {
  readonly workspaceId: WorkspaceId;
  readonly requestedBy: UserId;
  readonly requestedAt: IsoDateTime;
  readonly correlationId?: string;
}

/**
 * A domain mutation request. `expectedRevision` is optional for creates and
 * required by domain handlers when optimistic concurrency must be enforced.
 */
export interface DomainCommand<TPayload = Readonly<Record<string, unknown>>> {
  readonly commandId: CommandId;
  readonly type: string;
  readonly entityId?: EntityId;
  readonly expectedRevision?: Revision;
  readonly context: CommandContext;
  readonly payload: TPayload;
}
