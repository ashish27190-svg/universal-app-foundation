import type { EntityId, UserId, WorkspaceId } from '../src/index';

declare const entityId: EntityId;
declare const workspaceId: WorkspaceId;
declare const userId: UserId;

const acceptsEntityId = (_value: EntityId): void => undefined;
const acceptsWorkspaceId = (_value: WorkspaceId): void => undefined;
const acceptsUserId = (_value: UserId): void => undefined;

acceptsEntityId(entityId);
acceptsWorkspaceId(workspaceId);
acceptsUserId(userId);

// These compile-time failures are intentional: branded identifiers must not mix.
// @ts-expect-error WorkspaceId must not be accepted where EntityId is required.
acceptsEntityId(workspaceId);
// @ts-expect-error UserId must not be accepted where WorkspaceId is required.
acceptsWorkspaceId(userId);
// @ts-expect-error EntityId must not be accepted where UserId is required.
acceptsUserId(entityId);
