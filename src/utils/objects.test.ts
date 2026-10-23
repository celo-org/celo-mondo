import { describe, expect, it } from 'vitest';
import { deserializeBigints, serializeBigints } from './objects';

describe('serializeBigints / deserializeBigints', () => {
  it('round-trips bigints at any nesting level', () => {
    const input = {
      a: 123n,
      b: [{ votes: 43934012849665942471839n }, { votes: 0n }],
      c: { nested: { deep: -5n } },
    };
    const result = deserializeBigints<typeof input>(serializeBigints(input));
    expect(result.a).toBe(123n);
    expect(result.b[0].votes).toBe(43934012849665942471839n);
    expect(result.b[1].votes).toBe(0n);
    expect(result.c.nested.deep).toBe(-5n);
  });

  it('round-trips primitives, null, and plain strings unchanged', () => {
    const input = { s: 'hello', n: 42, f: 1.5, t: true, nil: null, arr: [1, 'two', null] };
    expect(deserializeBigints(serializeBigints(input))).toEqual(input);
  });

  it('round-trips Date objects', () => {
    const date = new Date('2026-08-18T10:00:00.000Z');
    const result = deserializeBigints<{ d: Date }>(serializeBigints({ d: date }));
    expect(result.d).toBeInstanceOf(Date);
    expect(result.d.getTime()).toBe(date.getTime());
  });

  it('does not misinterpret attacker-controlled strings as encoded values', () => {
    // On-chain account names are arbitrary strings chosen by third parties
    const hostile = {
      name: '__bigint__:123',
      other: '{"__serdeType":"bigint","value":"9"}',
      tagLike: '__serdeType',
    };
    const result = deserializeBigints<typeof hostile>(serializeBigints(hostile));
    expect(result.name).toBe('__bigint__:123');
    expect(result.other).toBe('{"__serdeType":"bigint","value":"9"}');
    expect(result.tagLike).toBe('__serdeType');
  });

  it('drops undefined object values like JSON.stringify does', () => {
    const result = deserializeBigints<Record<string, unknown>>(
      serializeBigints({ present: 1n, missing: undefined }),
    );
    expect(result.present).toBe(1n);
    expect('missing' in result).toBe(false);
  });

  it('preserves undefined inside arrays as null like JSON.stringify does', () => {
    const result = deserializeBigints<unknown[]>(serializeBigints([1n, undefined, 2n]));
    expect(result).toEqual([1n, null, 2n]);
  });
});
