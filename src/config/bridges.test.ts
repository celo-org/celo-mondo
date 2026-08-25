import { BRIDGES, sortBridgesForDisplay } from 'src/config/bridges';
import { Bridge } from 'src/types/bridge';
import { describe, expect, test } from 'vitest';

function makeBridge(
  overrides: Partial<Bridge> & { clickCount: number },
): Bridge & { clickCount: number } {
  return {
    id: 'test-bridge',
    name: 'Test Bridge',
    operator: 'Test',
    href: 'https://example.com',
    logo: '/logo.png',
    description: 'Test bridge',
    ...overrides,
  };
}

describe('sortBridgesForDisplay', () => {
  test('sorts unpinned bridges by click count descending, then name ascending', () => {
    const bridges = [
      makeBridge({ id: 'a', name: 'Alpha', clickCount: 5 }),
      makeBridge({ id: 'b', name: 'Beta', clickCount: 10 }),
      makeBridge({ id: 'c', name: 'Charlie', clickCount: 5 }),
    ];

    const sorted = sortBridgesForDisplay(bridges);

    expect(sorted.map((bridge) => bridge.id)).toEqual(['b', 'a', 'c']);
  });

  test('places pinned bridge at its pinned index regardless of click count', () => {
    const bridges = [
      makeBridge({ id: 'a', name: 'Alpha', clickCount: 100 }),
      makeBridge({ id: 'b', name: 'Beta', clickCount: 90 }),
      makeBridge({ id: 'pinned', name: 'Pinned', clickCount: 0, pinnedIndex: 1 }),
      makeBridge({ id: 'c', name: 'Charlie', clickCount: 80 }),
    ];

    const sorted = sortBridgesForDisplay(bridges);

    expect(sorted.map((bridge) => bridge.id)).toEqual(['a', 'pinned', 'b', 'c']);
  });

  test('clamps pinned index beyond list length to the end', () => {
    const bridges = [
      makeBridge({ id: 'a', name: 'Alpha', clickCount: 10 }),
      makeBridge({ id: 'pinned', name: 'Pinned', clickCount: 0, pinnedIndex: 99 }),
    ];

    const sorted = sortBridgesForDisplay(bridges);

    expect(sorted.map((bridge) => bridge.id)).toEqual(['a', 'pinned']);
  });

  test('does not mutate the input array', () => {
    const bridges = [
      makeBridge({ id: 'a', name: 'Alpha', clickCount: 1 }),
      makeBridge({ id: 'b', name: 'Beta', clickCount: 2 }),
    ];
    const originalOrder = bridges.map((bridge) => bridge.id);

    sortBridgesForDisplay(bridges);

    expect(bridges.map((bridge) => bridge.id)).toEqual(originalOrder);
  });
});

describe('BRIDGES config', () => {
  test('pins Squid Router to third position', () => {
    const squid = BRIDGES.find((bridge) => bridge.id === 'squid-router');
    expect(squid?.pinnedIndex).toBe(2);
  });
});
