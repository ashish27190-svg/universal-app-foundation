import type { CalculationId, IsoDateTime } from './ids';
import type { Confidence } from './entity';

export type CalculationVersion = string;

export interface CalculationDefinition {
  readonly id: CalculationId;
  readonly name: string;
  readonly version: CalculationVersion;
  readonly description?: string;
  readonly outputUnit?: string;
}

export interface CalculationEvidence {
  readonly inputsUsed: readonly string[];
  readonly inputsExcluded?: readonly string[];
  readonly assumptions?: readonly string[];
}

export interface CalculationResult<TValue> {
  readonly calculationId: CalculationId;
  readonly calculationVersion: CalculationVersion;
  readonly value: TValue;
  readonly unit?: string;
  readonly confidence: Confidence;
  readonly calculatedAt: IsoDateTime;
  readonly evidence: CalculationEvidence;
  readonly explanation?: string;
}
