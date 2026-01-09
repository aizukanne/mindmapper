# Relationship Model Implementation Workplan

**Project:** Comprehensive Relationship Computation Engine
**Design Document:** `/design/relationship-model-architecture.md`
**Created:** 2026-01-08
**Status:** Complete - All Phases Done (100%)

---

## Progress Summary

| Phase | Tasks | Completed | Progress |
|-------|-------|-----------|----------|
| Phase 1: Core Engine | 18 | 18 | 100% |
| Phase 2: API Integration | 12 | 12 | 100% |
| Phase 3: UI Integration | 10 | 10 | 100% |
| Phase 4: Optimization | 8 | 8 | 100% |
| Phase 5: Testing & QA | 10 | 10 | 100% |
| **Total** | **58** | **58** | **100%** |

---

## Phase 1: Core Engine

**Goal:** Create the `/packages/family-graph/` package with all computation logic.

### 1.1 Package Setup
- [x] Create `/packages/family-graph/` directory structure
- [x] Create `package.json` with dependencies
- [x] Create `tsconfig.json` extending root config
- [x] Create `src/index.ts` with exports
- [x] Add package to workspace in root `package.json` (auto via workspaces glob)
- [x] Run `pnpm install` to link package

### 1.2 Graph Data Structure (`src/graph.ts`)
- [x] Define `Person` interface (minimal fields needed for computation)
- [x] Define `StoredRelationship` interface
- [x] Implement `FamilyGraph` class with:
  - [x] `persons: Map<string, Person>` - person lookup
  - [x] `parentOf: Map<string, Set<string>>` - parent → children
  - [x] `childOf: Map<string, Set<string>>` - child → parents
  - [x] `spouseOf: Map<string, Set<string>>` - spouse connections
- [x] Implement `FamilyGraph.fromData()` static factory method
- [x] Implement `getParents(personId)` method
- [x] Implement `getChildren(personId)` method
- [x] Implement `getSpouses(personId)` method
- [x] Implement `getPerson(personId)` method

### 1.3 Traversal Algorithms (`src/traversal.ts`)
- [x] Implement `getAllAncestorsWithDistance(personId, graph)` using BFS
  - Returns `Map<ancestorId, TraversalResult>`
- [x] Implement `getAllDescendantsWithDistance(personId, graph)` using BFS
  - Returns `Map<descendantId, TraversalResult>`
- [x] Implement `getSiblings(personId, graph)` (in graph.ts)
  - Returns array of sibling IDs with half/full/step classification
- [x] Implement `getPathToAncestor(personId, ancestorId, graph)`
  - Returns path from person to specific ancestor

### 1.4 Common Ancestor Algorithm (`src/ancestors.ts`)
- [x] Define `CommonAncestor` interface:
  ```typescript
  { ancestorId, ancestor, distanceFromA, distanceFromB, totalDistance }
  ```
- [x] Implement `findCommonAncestors(personA, personB, graph)`
  - Uses bidirectional BFS
  - Returns all common ancestors sorted by total distance (MRCA first)
- [x] Implement `getMRCA(personA, personB, graph)` (convenience wrapper)

### 1.5 Relationship Computation (`src/compute.ts`)
- [x] Define `ComputedRelationship` interface:
  ```typescript
  {
    fromPersonId, toPersonId,
    type, displayName,
    consanguinity, generationDifference,
    cousinDegree?, cousinRemoval?,
    isBloodRelation, isInLaw, isStep, isHalf,
    path
  }
  ```
- [x] Implement `computeRelationship(personA, personB, graph)` main function
- [x] Implement `checkDirectRelationship()` helper
- [x] Implement `classifyBloodRelationship(gen1, gen2, gender)` helper
- [x] Implement `computeInLawRelationship()` helper
- [x] Implement `computeStepRelationship()` helper
- [x] Implement `calculateCousin(gen1, gen2)` helper (in naming.ts)
- [x] Implement half-sibling detection (in graph.ts getSiblings)

### 1.6 Relationship Naming (`src/naming.ts`)
- [x] Implement `RelationshipNamer` class with static methods:
  - [x] `nameAncestor(generations, gender)` → "father", "grandmother", "2x great-grandfather"
  - [x] `nameDescendant(generations, gender)` → "son", "granddaughter", "3x great-grandson"
  - [x] `nameAuntUncle(generationsUp, gender)` → "aunt", "great-uncle", "2x great-aunt"
  - [x] `nameNephewNiece(generationsDown, gender)` → "nephew", "great-niece"
  - [x] `nameCousin(degree, removal)` → "1st cousin", "2nd cousin once removed"
  - [x] `nameSibling(gender, isHalf)` → "brother", "half-sister"
  - [x] `addQualifiers(baseName, {isHalf, isStep, isAdoptive, isInLaw})`

### 1.7 Package Exports (`src/index.ts`)
- [x] Export all public interfaces
- [x] Export `FamilyGraph` class
- [x] Export `computeRelationship` function
- [x] Export `findCommonAncestors` function
- [x] Export `RelationshipNamer` class
- [x] Export traversal utilities

---

## Phase 2: API Integration

**Goal:** Add REST API endpoints for relationship computation.

### 2.1 New Routes File (`apps/api/src/routes/relationship-compute.ts`)
- [x] Create new route file for computed relationships
- [x] Register routes in main app

### 2.2 Core Endpoints
- [x] `GET /api/family-trees/:treeId/computed/relationship/:personAId/:personBId`
  - Computes and returns the relationship between two people
  - Include path information
  - Include all relationship metadata

- [x] `GET /api/family-trees/:treeId/computed/people/:personId/relatives`
  - Query params: `type`, `degree`, `removal`, `maxGenerations`, `includeInLaws`, `limit`, `offset`
  - Returns paginated list of relatives matching criteria

- [x] `GET /api/family-trees/:treeId/computed/people/:personId/family`
  - Returns immediate family (parents, children, spouses, siblings)
  - Optimized single query

- [x] `GET /api/family-trees/:treeId/computed/relationship-path/:personAId/:personBId`
  - Returns all paths connecting two people
  - For visualization

### 2.3 Search Endpoints
- [x] `GET /api/family-trees/:treeId/computed/relationship-search`
  - Query params: `fromPersonId`, `query` (e.g., "3rd cousin")
  - Natural language relationship search

- [x] `POST /api/family-trees/:treeId/computed/how-related`
  - Body: `{ personIds: string[] }`
  - Returns relationships between all pairs
  - Identifies common ancestors

### 2.4 Statistics Endpoint
- [x] `GET /api/family-trees/:treeId/computed/people/:personId/relationship-stats`
  - Returns: totalRelatives, bloodRelatives, inLawRelatives
  - Generations up/down, closest cousin degree

### 2.5 Graph Loading
- [x] Implement efficient tree loading for graph construction
- [x] Add tree-level caching of FamilyGraph instances (5-min TTL + version-based invalidation)
- [x] Implement cache invalidation on relationship changes

---

## Phase 3: UI Integration

**Goal:** Update the frontend to use computed relationships.

### 3.1 API Client Updates (`apps/web/src/lib/relationship-api.ts`)
- [x] Add `getComputedRelationship(treeId, personAId, personBId)` function
- [x] Add `getRelatives(treeId, personId, query)` function
- [x] Add `getRelationshipPaths(treeId, personAId, personBId)` function
- [x] Add `getRelationshipStats(treeId, personId)` function
- [x] Add `searchRelatives(treeId, fromPersonId, query)` function
- [x] Add `getHowRelated(treeId, personIds)` function
- [x] Add `getCommonAncestors(treeId, personAId, personBId)` function

### 3.2 React Hooks (`apps/web/src/hooks/useComputedRelationship.ts`)
- [x] Create `useComputedRelationship` hook
- [x] Create `useImmediateFamily` hook
- [x] Create `useRelationshipStats` hook
- [x] Create `useHowRelated` hook
- [x] Create `useRelationshipSearch` hook

### 3.3 New Components
- [x] Create `RelationshipBadge` component (`apps/web/src/components/family-tree/RelationshipBadge.tsx`)
  - Displays computed relationship name with appropriate styling
  - Color-coded by relationship type (blood, in-law, step, etc.)
- [x] Create `HowAreWeRelatedModal` component (`apps/web/src/components/family-tree/HowAreWeRelatedModal.tsx`)
  - Select two people, show relationship
  - Shows common ancestors and relationship path
- [x] Create `RelationshipSearchModal` component (`apps/web/src/components/family-tree/RelationshipSearchModal.tsx`)
  - Search for relatives by relationship type
  - Quick search suggestions

### 3.4 FamilyTreeEditor Integration (`apps/web/src/pages/FamilyTreeEditor.tsx`)
- [x] Add "Find Relatives" button to toolbar
- [x] Add "How Related?" button to toolbar
- [x] Wire up HowAreWeRelatedModal
- [x] Wire up RelationshipSearchModal

### 3.5 Previously Deferred Items (Now Complete)
- [x] Update PersonDetailModal to show computed relationship name to linked person
- [x] Layout updates for computed generations (relative generation indicators)

---

## Phase 4: Optimization

**Goal:** Ensure performance at scale (10,000+ people).

### 4.1 Caching Layer (`packages/family-graph/src/cache.ts`)
- [x] Implement `RelationshipCache` class with:
  - [x] L1: In-memory LRU cache (hot data, 10k entries, 1hr TTL)
  - [x] Version-based invalidation (alternative to L2 database cache)
- [x] Implement cache key generation (`generateCacheKey`)
- [x] Implement `get(treeId, fromId, toId)` with tiered lookup
- [x] Implement `set(treeId, relationship)` with write-through
- [x] Implement `invalidateTree(treeId)` and `invalidatePerson(treeId, personId)` cascade invalidation

### 4.2 Database Optimization
- [x] Add database indexes to Prisma schema:
  - [x] `idx_rel_person_type` on relationships(treeId, personFromId, relationshipType)
  - [x] `idx_rel_related_type` on relationships(treeId, personToId, relationshipType)
  - [x] Composite index for bidirectional lookups (personFromId, personToId)
- [x] Regenerated Prisma client with new indexes

### 4.3 Batch Operations
- [x] Implement `computeRelationshipsBatch(pairs: [personA, personB][], graph)`
- [x] Implement `findAllRelativesOfType(personId, type, graph, options)`
- [x] Implement `computeRelationshipMatrix(personIds, graph)` for all-pairs computation
- [x] Implement `getRelationshipCounts(personId, graph)` for statistics

### 4.4 API Integration
- [x] Add batch API endpoint `POST /api/family-trees/:treeId/computed/batch`
- [x] Add cache stats endpoint `GET /api/family-trees/:treeId/computed/cache-stats`
- [x] Add cache clear endpoint `POST /api/family-trees/:treeId/computed/clear-cache`

---

## Phase 5: Testing & QA

**Goal:** Comprehensive test coverage and quality assurance.

### 5.1 Unit Tests (`packages/family-graph/tests/`)
- [x] Test `FamilyGraph` construction and methods (33 tests in `graph.test.ts`)
- [x] Test `getAllAncestorsWithDistance` with various tree shapes (45 tests in `traversal.test.ts`)
- [x] Test `findCommonAncestors` edge cases (43 tests in `ancestors.test.ts`):
  - [x] Direct ancestors (parent, grandparent)
  - [x] Siblings (shared parents)
  - [x] Cousins at various degrees
  - [x] No common ancestor (unrelated)
- [x] Test `computeRelationship` for all relationship types (48 tests in `compute.test.ts`):
  - [x] Parent/child
  - [x] Grandparent/grandchild (multiple generations)
  - [x] Siblings (full and half)
  - [x] Aunt/uncle, nephew/niece
  - [x] Cousins (1st, 2nd, with removals)
  - [x] In-laws
  - [x] Step relations
- [x] Test `RelationshipNamer` for all naming patterns (52 tests in `naming.test.ts`)
- [x] Test `LRUCache` and `RelationshipCache` (35 tests in `cache.test.ts`)

### 5.2 Test Infrastructure
- [x] Created `vitest.config.ts` for package
- [x] Created comprehensive `test-helpers.ts` with family builders:
  - Nuclear family, three-generation, cousins, second cousins
  - Half-siblings, step family, in-law family
  - Disconnected graphs, single person, large families

### 5.3 Performance Tests (included in compute.test.ts)
- [x] Benchmark single relationship computation with medium tree
- [x] Benchmark batch computation efficiency

### 5.4 Edge Case Testing (included in test suite)
- [x] Self-relationship handling
- [x] Disconnected tree segments
- [x] Single-person trees
- [x] Non-existent persons

**Total: 256 tests, all passing**

---

## Milestones

| Milestone | Target | Deliverable |
|-----------|--------|-------------|
| M1: Core Complete | Phase 1 done | Working computation engine |
| M2: API Ready | Phase 2 done | All endpoints functional |
| M3: UI Live | Phase 3 done | Users can see computed relationships |
| M4: Production Ready | Phase 4+5 done | Optimized and tested |

---

## Dependencies

### External Packages (to evaluate)
- [ ] Evaluate `lru-cache` for in-memory caching
- [ ] Evaluate graph libraries (likely not needed, custom is fine)

### Internal Dependencies
- `@mindmapper/db` - Prisma client for database access
- Existing relationship routes for integration

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance with large trees | High | Implement caching early, lazy loading |
| Complex edge cases | Medium | Comprehensive test suite |
| Cache invalidation bugs | Medium | Clear invalidation rules, testing |
| UI complexity | Low | Incremental rollout |

---

## Notes & Decisions

### Decision Log
- **2026-01-08**: Decided to compute relationships on-demand rather than pre-compute and store all pairs (N² storage problem)
- **2026-01-08**: Using BFS for ancestor traversal (simpler, guaranteed shortest path)

### Open Questions
- [ ] Should we support custom relationship types (godparent, mentor)?
- [ ] How to handle ambiguous relationships (e.g., adopted AND step)?
- [ ] Should removed cousin direction matter ("older" vs "younger" removed)?

---

## Change Log

| Date | Change | By |
|------|--------|-----|
| 2026-01-08 | Initial workplan created | Claude |
| 2026-01-08 | Phase 1 complete - Core computation engine | Claude |
| 2026-01-08 | Phase 2 complete - API integration | Claude |
| 2026-01-08 | Phase 3 complete - UI integration | Claude |
| 2026-01-08 | Phase 4 complete - Optimization (LRU cache, batch ops, DB indexes) | Claude |
| 2026-01-08 | Phase 5 complete - Testing & QA (256 tests, all passing) | Claude |
| 2026-01-09 | Phase 3 deferred items complete - PersonDetailModal relationship display & relative generation indicators | Claude |

