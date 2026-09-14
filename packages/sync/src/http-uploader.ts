import type { AuthService } from '@uaf/auth';
import type { CommonPowerSyncDatabase } from '@powersync/web';
import type { PowerSyncMutationUploader } from './connector';
import {
  UAF_MUTATION_PROTOCOL_VERSION,
  crudEntryToMutationEnvelope,
  type MutationBatchResponse,
} from './mutation';

export interface HttpMutationUploaderOptions {
  readonly endpoint: string;
  readonly auth: AuthService;
  readonly fetchImpl?: typeof fetch;
  readonly batchSize?: number;
}

export class HttpMutationUploader implements PowerSyncMutationUploader {
  private readonly fetchImpl: typeof fetch;
  private readonly batchSize: number;

  constructor(private readonly options: HttpMutationUploaderOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.batchSize = options.batchSize ?? 50;
  }

  async upload(database: CommonPowerSyncDatabase): Promise<void> {
    const batch = await database.getCrudBatch(this.batchSize);
    if (!batch) return;

    const session = await this.options.auth.getSession();
    if (!session) throw new Error('Cannot upload PowerSync mutations without an authenticated session.');

    const clientDatabaseId = await database.getClientId();
    const mutations = batch.crud.map((entry) => crudEntryToMutationEnvelope(entry, clientDatabaseId));

    const response = await this.fetchImpl(this.options.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        protocolVersion: UAF_MUTATION_PROTOCOL_VERSION,
        mutations,
      }),
    });

    if (!response.ok) {
      throw new Error(`UAF mutation gateway returned HTTP ${response.status}.`);
    }

    const result = (await response.json()) as MutationBatchResponse;
    if (result.protocolVersion !== UAF_MUTATION_PROTOCOL_VERSION) {
      throw new Error('UAF mutation gateway returned an incompatible protocol version.');
    }
    if (result.outcomes.length !== mutations.length) {
      throw new Error('UAF mutation gateway returned an incomplete mutation outcome set.');
    }

    const expected = new Set(mutations.map((mutation) => String(mutation.mutationId)));
    for (const outcome of result.outcomes) {
      if (!expected.delete(String(outcome.mutationId))) {
        throw new Error('UAF mutation gateway returned an unknown or duplicate mutation outcome.');
      }
    }
    if (expected.size > 0) throw new Error('UAF mutation gateway omitted one or more mutation outcomes.');

    // Applied, idempotent, conflict and rejected are all terminal. Conflict/rejection
    // details are recorded server-side for the client to sync back and review.
    await batch.complete();
  }
}
