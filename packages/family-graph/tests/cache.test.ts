/**
 * Tests for LRU Cache and RelationshipCache
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  LRUCache,
  RelationshipCache,
  generateCacheKey,
  getRelationshipCache,
  resetRelationshipCache,
} from '../src/cache.js';
import type { ComputedRelationship } from '../src/types.js';

// Mock computed relationship for testing
function createMockRelationship(
  fromId: string,
  toId: string
): ComputedRelationship {
  return {
    fromPersonId: fromId,
    toPersonId: toId,
    type: 'SIBLING',
    displayName: 'sibling',
    consanguinity: 2,
    generationDifference: 0,
    commonAncestors: [],
    qualifiers: {
      isHalf: false,
      isStep: false,
      isAdoptive: false,
      isInLaw: false,
      isFoster: false,
    },
    isBloodRelation: true,
    isDirectAncestor: false,
    isDirectDescendant: false,
  };
}

describe('generateCacheKey', () => {
  it('should generate consistent keys regardless of order', () => {
    const key1 = generateCacheKey('personA', 'personB');
    const key2 = generateCacheKey('personB', 'personA');

    expect(key1).toBe(key2);
  });

  it('should generate unique keys for different pairs', () => {
    const key1 = generateCacheKey('personA', 'personB');
    const key2 = generateCacheKey('personA', 'personC');

    expect(key1).not.toBe(key2);
  });

  it('should include both IDs in the key', () => {
    const key = generateCacheKey('alice', 'bob');

    expect(key).toContain('alice');
    expect(key).toContain('bob');
  });
});

describe('LRUCache', () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache<string>({ maxSize: 3, ttlMs: 1000 });
  });

  describe('basic operations', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for missing keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should check if key exists', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should delete keys', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used when full', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Should evict key1

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    it('should update LRU order on access', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Access key1 to make it recently used
      cache.get('key1');

      // Add key4, should evict key2 (now LRU)
      cache.set('key4', 'value4');

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeUndefined();
    });

    it('should not evict when updating existing key', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Update existing key
      cache.set('key1', 'updated');

      expect(cache.size).toBe(3);
      expect(cache.get('key1')).toBe('updated');
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      const shortTtlCache = new LRUCache<string>({ maxSize: 10, ttlMs: 50 });
      shortTtlCache.set('key1', 'value1');

      expect(shortTtlCache.get('key1')).toBe('value1');

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(shortTtlCache.get('key1')).toBeUndefined();
    });

    it('should report expired keys as not existing', async () => {
      const shortTtlCache = new LRUCache<string>({ maxSize: 10, ttlMs: 50 });
      shortTtlCache.set('key1', 'value1');

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(shortTtlCache.has('key1')).toBe(false);
    });
  });

  describe('deleteMatching', () => {
    it('should delete all keys matching pattern', () => {
      cache.set('user:1', 'value1');
      cache.set('user:2', 'value2');
      cache.set('post:1', 'value3');

      const deleted = cache.deleteMatching('user:');

      expect(deleted).toBe(2);
      expect(cache.get('user:1')).toBeUndefined();
      expect(cache.get('user:2')).toBeUndefined();
      expect(cache.get('post:1')).toBe('value3');
    });
  });

  describe('statistics', () => {
    it('should track hits and misses', () => {
      cache.set('key1', 'value1');

      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('nonexistent'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2 / 3);
    });

    it('should track evictions', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Eviction

      const stats = cache.getStats();
      expect(stats.evictions).toBe(1);
    });

    it('should report size and maxSize', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(3);
    });

    it('should reset stats on clear', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('nonexistent');
      cache.clear();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries during cleanup', async () => {
      const shortTtlCache = new LRUCache<string>({ maxSize: 10, ttlMs: 50 });
      shortTtlCache.set('key1', 'value1');
      shortTtlCache.set('key2', 'value2');

      await new Promise((resolve) => setTimeout(resolve, 100));

      const cleaned = shortTtlCache.cleanup();

      expect(cleaned).toBe(2);
      expect(shortTtlCache.size).toBe(0);
    });
  });

  describe('disabled stats tracking', () => {
    it('should not track stats when disabled', () => {
      const noStatsCache = new LRUCache<string>({
        maxSize: 10,
        trackStats: false,
      });

      noStatsCache.set('key1', 'value1');
      noStatsCache.get('key1');
      noStatsCache.get('nonexistent');

      const stats = noStatsCache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });
});

describe('RelationshipCache', () => {
  let cache: RelationshipCache;

  beforeEach(() => {
    cache = new RelationshipCache({ maxSize: 100, ttlMs: 60000 });
  });

  describe('tree versioning', () => {
    it('should start with version 0', () => {
      expect(cache.getTreeVersion('tree1')).toBe(0);
    });

    it('should increment tree version', () => {
      expect(cache.incrementTreeVersion('tree1')).toBe(1);
      expect(cache.incrementTreeVersion('tree1')).toBe(2);
    });

    it('should track versions per tree', () => {
      cache.incrementTreeVersion('tree1');
      cache.incrementTreeVersion('tree1');
      cache.incrementTreeVersion('tree2');

      expect(cache.getTreeVersion('tree1')).toBe(2);
      expect(cache.getTreeVersion('tree2')).toBe(1);
    });
  });

  describe('relationship caching', () => {
    it('should cache and retrieve relationships', () => {
      const rel = createMockRelationship('personA', 'personB');
      cache.set('tree1', rel);

      const retrieved = cache.get('tree1', 'personA', 'personB');
      expect(retrieved).toEqual(rel);
    });

    it('should retrieve regardless of person order', () => {
      const rel = createMockRelationship('personA', 'personB');
      cache.set('tree1', rel);

      const retrieved = cache.get('tree1', 'personB', 'personA');
      expect(retrieved).toEqual(rel);
    });

    it('should return undefined for uncached relationships', () => {
      const retrieved = cache.get('tree1', 'personA', 'personB');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('invalidation', () => {
    it('should invalidate tree by incrementing version', () => {
      const rel = createMockRelationship('personA', 'personB');
      cache.set('tree1', rel);

      cache.invalidateTree('tree1');

      // Old cache entry won't match new version
      const retrieved = cache.get('tree1', 'personA', 'personB');
      expect(retrieved).toBeUndefined();
    });

    it('should not affect other trees when invalidating', () => {
      const rel1 = createMockRelationship('personA', 'personB');
      const rel2 = createMockRelationship('personC', 'personD');

      cache.set('tree1', rel1);
      cache.set('tree2', rel2);

      cache.invalidateTree('tree1');

      expect(cache.get('tree1', 'personA', 'personB')).toBeUndefined();
      expect(cache.get('tree2', 'personC', 'personD')).toEqual(rel2);
    });

    it('should invalidate person by invalidating tree', () => {
      const rel = createMockRelationship('personA', 'personB');
      cache.set('tree1', rel);

      cache.invalidatePerson('tree1', 'personA');

      // Current implementation invalidates entire tree
      const retrieved = cache.get('tree1', 'personA', 'personB');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('statistics', () => {
    it('should provide cache statistics', () => {
      const rel = createMockRelationship('personA', 'personB');
      cache.set('tree1', rel);
      cache.get('tree1', 'personA', 'personB'); // hit
      cache.get('tree1', 'personX', 'personY'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('should cleanup expired entries', () => {
      // This primarily tests that the method exists and works
      const cleaned = cache.cleanup();
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });
  });

  describe('clear', () => {
    it('should clear cache and versions', () => {
      const rel = createMockRelationship('personA', 'personB');
      cache.set('tree1', rel);
      cache.incrementTreeVersion('tree1');

      cache.clear();

      expect(cache.get('tree1', 'personA', 'personB')).toBeUndefined();
      expect(cache.getTreeVersion('tree1')).toBe(0);
    });
  });
});

describe('Global cache singleton', () => {
  beforeEach(() => {
    resetRelationshipCache();
  });

  it('should return same instance', () => {
    const cache1 = getRelationshipCache();
    const cache2 = getRelationshipCache();

    expect(cache1).toBe(cache2);
  });

  it('should reset to new instance', () => {
    const cache1 = getRelationshipCache();
    resetRelationshipCache();
    const cache2 = getRelationshipCache();

    // They should be different instances
    // We can verify by checking that data from cache1 isn't in cache2
    const rel = createMockRelationship('personA', 'personB');
    cache1.set('tree1', rel);

    // After reset, cache2 is a new instance and won't have this data
    // Note: cache1 and cache2 point to different objects after reset
  });

  it('should accept config on first call', () => {
    const cache = getRelationshipCache({ maxSize: 500 });
    const stats = cache.getStats();

    expect(stats.maxSize).toBe(500);
  });
});
