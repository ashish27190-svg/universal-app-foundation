import { describe, expect, it } from 'vitest';
import { deterministicId } from './index';

describe('@uaf/test-kit', () => {
  it('creates deterministic fixture ids', () => {
    expect(deterministicId('asset')).toContain('asset-');
  });
});
