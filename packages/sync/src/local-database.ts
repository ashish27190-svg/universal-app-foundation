export interface LocalSqlRows {
  readonly length: number;
  readonly _array?: readonly unknown[];
}

export interface LocalSqlResult {
  readonly rows?: LocalSqlRows;
  readonly rowsAffected?: number;
}

export interface LocalSqlWatchObserver<T> {
  onData(rows: readonly T[]): void;
  onError?(error: Error): void;
}

/**
 * Small vendor-neutral SQLite surface used by app/domain adapters.
 * PowerSync's browser database satisfies this shape, but consumers do not need
 * to import PowerSync types directly.
 */
export interface LocalSqlDatabase {
  execute(sql: string, parameters?: any[]): Promise<LocalSqlResult>;
  getAll<T = Record<string, unknown>>(sql: string, parameters?: any[]): Promise<T[]>;
  /** Subscribe to query results when underlying local tables change. */
  watch<T = Record<string, unknown>>(
    sql: string,
    parameters: any[] | undefined,
    observer: LocalSqlWatchObserver<T>,
  ): () => void;
}
