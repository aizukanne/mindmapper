/**
 * Relationship Cache - LRU cache for computed relationships
 *
 * Provides fast lookup for recently computed relationships.
 * Uses a two-tier caching strategy:
 * - L1: In-memory LRU cache with configurable size and TTL
 * - L2: Optional persistent cache (can be extended for Redis/DB)
 *
 * Features:
 * - LRU eviction when cache is full
 * - TTL-based expiration
 * - Cascade invalidation when relationships change
 * - Statistics tracking for monitoring
 */

import type { ComputedRelationship } from './types.js';

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
  /** Maximum number of entries (default: 10000) */
  maxSize?: number;
  /** TTL in milliseconds (default: 1 hour) */
  ttlMs?: number;
  /** Enable statistics tracking (default: true) */
  trackStats?: boolean;
}

/**
 * Generate a canonical cache key for a relationship pair.
 * Keys are ordered so (A, B) and (B, A) map to the same key.
 */
export function generateCacheKey(personAId: string, personBId: string): string {
  // Sort IDs to ensure consistent key regardless of order
  const [first, second] = [personAId, personBId].sort();
  return `${first}:${second}`;
}

/**
 * LRU Cache implementation with TTL support
 */
export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private readonly trackStats: boolean;

  // Statistics
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(config: CacheConfig = {}) {
    this.maxSize = config.maxSize ?? 10000;
    this.ttlMs = config.ttlMs ?? 60 * 60 * 1000; // 1 hour default
    this.trackStats = config.trackStats ?? true;
    this.cache = new Map();
  }

  /**
   * Get a value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.trackStats) this.stats.misses++;
      return undefined;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      if (this.trackStats) this.stats.misses++;
      return undefined;
    }

    // Update access metadata for LRU
    entry.accessCount++;
    entry.lastAccess = Date.now();

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    if (this.trackStats) this.stats.hits++;
    return entry.value;
  }

  /**
   * Set a value in cache
   */
  set(key: string, value: T): void {
    // Check if we need to evict
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccess: Date.now(),
    };

    this.cache.set(key, entry);
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  /**
   * Delete all keys matching a pattern (e.g., all keys containing a person ID)
   */
  deleteMatching(pattern: string): number {
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Get current cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Evict the least recently used entry
   */
  private evictLRU(): void {
    // Map maintains insertion order, first entry is LRU
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
      if (this.trackStats) this.stats.evictions++;
    }
  }

  /**
   * Clean up expired entries (call periodically)
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

/**
 * Specialized cache for computed relationships
 */
export class RelationshipCache {
  private cache: LRUCache<ComputedRelationship>;
  private treeVersions: Map<string, number>;

  constructor(config: CacheConfig = {}) {
    this.cache = new LRUCache<ComputedRelationship>(config);
    this.treeVersions = new Map();
  }

  /**
   * Get the current version for a tree
   */
  getTreeVersion(treeId: string): number {
    return this.treeVersions.get(treeId) ?? 0;
  }

  /**
   * Increment tree version (invalidates all cache entries for this tree)
   */
  incrementTreeVersion(treeId: string): number {
    const current = this.getTreeVersion(treeId);
    const newVersion = current + 1;
    this.treeVersions.set(treeId, newVersion);
    return newVersion;
  }

  /**
   * Generate a versioned cache key
   */
  private generateKey(treeId: string, personAId: string, personBId: string): string {
    const version = this.getTreeVersion(treeId);
    const pairKey = generateCacheKey(personAId, personBId);
    return `${treeId}:v${version}:${pairKey}`;
  }

  /**
   * Get a cached relationship
   */
  get(treeId: string, personAId: string, personBId: string): ComputedRelationship | undefined {
    const key = this.generateKey(treeId, personAId, personBId);
    return this.cache.get(key);
  }

  /**
   * Cache a computed relationship
   */
  set(treeId: string, relationship: ComputedRelationship): void {
    const key = this.generateKey(treeId, relationship.fromPersonId, relationship.toPersonId);
    this.cache.set(key, relationship);
  }

  /**
   * Invalidate all cached relationships for a tree
   */
  invalidateTree(treeId: string): void {
    this.incrementTreeVersion(treeId);
    // Old entries will naturally expire or be evicted
    // We increment version so old keys won't match
  }

  /**
   * Invalidate relationships involving a specific person
   * Call this when a person's relationships change
   */
  invalidatePerson(treeId: string, personId: string): void {
    // The simplest approach is to invalidate the entire tree
    // This ensures consistency when relationship chains change
    this.invalidateTree(treeId);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    return this.cache.cleanup();
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
    this.treeVersions.clear();
  }
}

/**
 * Create a singleton relationship cache
 */
let globalRelationshipCache: RelationshipCache | null = null;

export function getRelationshipCache(config?: CacheConfig): RelationshipCache {
  if (!globalRelationshipCache) {
    globalRelationshipCache = new RelationshipCache(config);
  }
  return globalRelationshipCache;
}

/**
 * Reset the global cache (useful for testing)
 */
export function resetRelationshipCache(): void {
  if (globalRelationshipCache) {
    globalRelationshipCache.clear();
  }
  globalRelationshipCache = null;
}
