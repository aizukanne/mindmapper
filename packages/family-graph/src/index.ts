/**
 * @mindmapper/family-graph
 *
 * Comprehensive relationship computation engine for family trees.
 *
 * This package provides algorithms to:
 * - Build in-memory family graphs from database records
 * - Traverse ancestor/descendant relationships
 * - Find common ancestors between any two people
 * - Compute and name relationships (cousin, aunt, in-law, etc.)
 * - Search for relatives by relationship type
 *
 * @example
 * ```typescript
 * import { FamilyGraph, computeRelationship } from '@mindmapper/family-graph';
 *
 * // Build graph from database records
 * const graph = FamilyGraph.fromData(persons, relationships);
 *
 * // Compute relationship between two people
 * const relationship = computeRelationship(personAId, personBId, graph);
 * console.log(relationship.displayName); // "2nd cousin once removed"
 * ```
 */

// Types - export all type definitions
export type {
  Gender,
  PersonNode,
  FoundationalRelationType,
  StoredRelationship,
  DerivedRelationType,
  RelationshipQualifiers,
  PathEdge,
  RelationshipPath,
  CommonAncestor,
  ComputedRelationship,
  RelativeSearchOptions,
  RelativeSearchResult,
  ImmediateFamily,
  RelationshipStats,
} from './types.js';

// Graph - the core data structure
export {
  FamilyGraph,
  PARENT_TYPES,
  CHILD_TYPES,
  SIBLING_TYPES,
  SPOUSE_TYPES,
} from './graph.js';
export type { EdgeMetadata, GraphEdge } from './graph.js';

// Traversal - BFS algorithms for ancestors/descendants
export {
  getAllAncestorsWithDistance,
  getAllDescendantsWithDistance,
  getPathToAncestor,
  getPathToDescendant,
  findAnyPath,
  findAllPaths,
  getPeopleAtGeneration,
  isAncestorOf,
  isDescendantOf,
  getGenerationalDistance,
  getGenerationSpan,
} from './traversal.js';
export type { TraversalResult } from './traversal.js';

// Ancestors - common ancestor algorithms
export {
  findCommonAncestors,
  getMRCA,
  getAllMRCAs,
  haveCommonAncestor,
  calculateConsanguinity,
  getCanonicalDegree,
  getCivilDegree,
  getRelativesThroughAncestor,
  hasMultipleRelationshipPaths,
} from './ancestors.js';

// Naming - relationship naming system
export { RelationshipNamer } from './naming.js';

// Compute - the main relationship computation engine
export {
  computeRelationship,
  computeRelationshipsBatch,
  findAllRelativesOfType,
  computeRelationshipMatrix,
  getRelationshipCounts,
} from './compute.js';
export type { BatchResult } from './compute.js';

// Cache - LRU cache for computed relationships
export {
  LRUCache,
  RelationshipCache,
  getRelationshipCache,
  resetRelationshipCache,
  generateCacheKey,
} from './cache.js';
export type { CacheStats, CacheConfig } from './cache.js';
