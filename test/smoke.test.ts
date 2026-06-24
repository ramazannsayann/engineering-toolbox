import { describe, it, expect } from 'vitest';

// Trivial smoke test — proves the Vitest runner is wired up correctly.
// Real calculator-logic tests arrive in later chunks, co-located with the
// pure functions they cover.
describe('toolchain smoke test', () => {
  it('runs the test runner', () => {
    expect(1 + 1).toBe(2);
  });
});
