import { describe, expect, it } from 'vitest';
import { cx, getSyncPresentation, UAF_UI_VERSION } from './index.js';

describe('@uaf/ui', () => {
  it('exports the BUILD 0.8 version', () => {
    expect(UAF_UI_VERSION).toBe('0.3.0-build.0.8');
  });

  it('only animates the actual syncing state', () => {
    expect(getSyncPresentation('syncing').animate).toBe(true);
    expect(getSyncPresentation('idle').animate).toBe(false);
    expect(getSyncPresentation('offline').animate).toBe(false);
    expect(getSyncPresentation('pending').animate).toBe(false);
    expect(getSyncPresentation('attention_required').animate).toBe(false);
  });

  it('joins optional class names without introducing false values', () => {
    expect(cx('one', false, undefined, 'two')).toBe('one two');
  });
});
