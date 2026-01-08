# Comprehensive Relationship Model Architecture

## Executive Summary

This document defines a complete relationship computation system for the MindMapper Family Tree application. The system automatically derives ALL genealogical relationships from minimal foundational data (parent-child and spouse relationships), enabling powerful search and discovery across generations.

**Core Philosophy**: Store minimal foundational relationships, compute everything else on demand.

---

## 1. Current State Analysis

### What Exists Today

The current system stores 12 explicit relationship types:
- `PARENT`, `CHILD`, `SPOUSE`, `SIBLING`
- `ADOPTIVE_PARENT`, `ADOPTIVE_CHILD`
- `STEP_PARENT`, `STEP_CHILD`
- `FOSTER_PARENT`, `FOSTER_CHILD`
- `GUARDIAN`, `WARD`

**Limitations**:
- No derived relationships (cousin, aunt, uncle, grandparent, etc.)
- Manual linking required for sibling relationships
- No "How are we related?" feature
- No relationship search capabilities

### Files Involved
- Schema: `/packages/db/prisma/schema.prisma`
- API: `/apps/api/src/routes/relationships.ts`
- Layout: `/apps/web/src/lib/family-tree-layout.ts`

---

## 2. Foundational Relationship Model

### 2.1 Primary Relationships (What We Store)

Only THREE types of relationships need to be explicitly stored:

```
1. PARENT_OF (directed)
   - Biological parent
   - Adoptive parent
   - Step-parent
   - Foster parent
   - Guardian

2. SPOUSE_OF (bidirectional)
   - Current marriage/partnership
   - Former marriage (with end date)

3. (Optional) SIBLING_OF (bidirectional)
   - Can be computed from shared parents
   - May store for half-sibling/step-sibling disambiguation
```

### 2.2 Derived Relationships (What We Compute)

From the foundational relationships above, ALL other relationships are computed:

```
DIRECT LINEAGE (Vertical)
├── Ancestors: parent → grandparent → great-grandparent → ...
├── Descendants: child → grandchild → great-grandchild → ...
└── Computed via: Upward/downward BFS traversal

COLLATERAL (Horizontal via common ancestor)
├── Siblings: Share parent(s)
├── Aunts/Uncles: Parent's siblings
├── Nieces/Nephews: Sibling's children
├── Cousins: Parent's sibling's descendants
└── Computed via: Common ancestor algorithm

AFFINITY (Through marriage)
├── In-laws: Spouse's relatives
├── Step-relations: Spouse's children from other relationships
└── Computed via: Spouse traversal + blood relationship
```

---

## 3. The Relationship Computation Engine

### 3.1 Core Algorithm: Common Ancestor Method

The key insight is that EVERY blood relationship can be expressed as:
- Distance to Most Recent Common Ancestor (MRCA) from Person A
- Distance to MRCA from Person B

```
           MRCA (Common Ancestor)
          /    \
      gen1      gen2
       ↓         ↓
    Person A   Person B

Relationship = f(gen1, gen2)
```

### 3.2 Relationship Classification Matrix

| gen1 | gen2 | Relationship |
|------|------|--------------|
| 0 | N | Person B is N-generation ancestor of A |
| N | 0 | Person B is N-generation descendant of A |
| 1 | 1 | Siblings |
| 1 | 2 | Person B is uncle/aunt of A |
| 2 | 1 | Person B is nephew/niece of A |
| N | N (N≥2) | (N-1)th cousins |
| N | M (N≠M, both≥2) | min(N,M)-1 cousin, \|N-M\| times removed |

### 3.3 Cousin Calculation Formula

```typescript
function calculateCousin(gen1: number, gen2: number): { degree: number; removal: number } {
  // Degree = how many generations back to shared ancestor, minus 1
  const degree = Math.min(gen1, gen2) - 1;

  // Removal = generational difference between the two people
  const removal = Math.abs(gen1 - gen2);

  return { degree, removal };
}

// Examples:
// gen1=2, gen2=2 → 1st cousin (share grandparents)
// gen1=3, gen2=3 → 2nd cousin (share great-grandparents)
// gen1=2, gen2=3 → 1st cousin once removed
// gen1=3, gen2=5 → 2nd cousin twice removed
```

### 3.4 Main Computation Algorithm

```typescript
function computeRelationship(personA: string, personB: string): Relationship | null {
  // Step 1: Handle trivial cases
  if (personA === personB) return { type: 'SELF' };

  // Step 2: Check direct relationships (spouse, parent, child)
  const direct = checkDirectRelationship(personA, personB);
  if (direct) return direct;

  // Step 3: Find common ancestors using bidirectional BFS
  const commonAncestors = findCommonAncestors(personA, personB);

  if (commonAncestors.length > 0) {
    // Use MRCA (closest common ancestor)
    const mrca = commonAncestors[0];
    return classifyBloodRelationship(mrca.distanceFromA, mrca.distanceFromB, personB);
  }

  // Step 4: Check in-law relationships (through spouse)
  const inLaw = checkInLawRelationship(personA, personB);
  if (inLaw) return inLaw;

  // Step 5: Check step relationships
  const step = checkStepRelationship(personA, personB);
  if (step) return step;

  return null; // No relationship found
}
```

---

## 4. Relationship Naming System

### 4.1 Direct Lineage Naming

```typescript
function nameAncestor(generations: number, gender: Gender): string {
  const suffix = gender === 'MALE' ? 'father' :
                 gender === 'FEMALE' ? 'mother' : 'parent';

  if (generations === 1) return suffix;                    // father/mother
  if (generations === 2) return `grand${suffix}`;          // grandfather/grandmother
  if (generations === 3) return `great-grand${suffix}`;    // great-grandfather

  // For 4+: 2x great-grandfather, 3x great-grandfather, etc.
  const greats = generations - 2;
  return `${greats}x great-grand${suffix}`;
}

function nameDescendant(generations: number, gender: Gender): string {
  const suffix = gender === 'MALE' ? 'son' :
                 gender === 'FEMALE' ? 'daughter' : 'child';

  if (generations === 1) return suffix;
  if (generations === 2) return `grand${suffix}`;
  if (generations === 3) return `great-grand${suffix}`;

  const greats = generations - 2;
  return `${greats}x great-grand${suffix}`;
}
```

### 4.2 Collateral Naming

```typescript
function nameAuntUncle(generationsUp: number, gender: Gender): string {
  const base = gender === 'MALE' ? 'uncle' :
               gender === 'FEMALE' ? 'aunt' : 'aunt/uncle';

  if (generationsUp === 2) return base;                    // aunt/uncle
  if (generationsUp === 3) return `great-${base}`;         // great-aunt

  const greats = generationsUp - 2;
  return `${greats}x great-${base}`;                       // 2x great-aunt
}

function nameCousin(degree: number, removal: number): string {
  const ordinal = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
  const removalWords = ['', 'once', 'twice', 'three times', 'four times', 'five times'];

  let name = `${ordinal[degree] || degree + 'th'} cousin`;

  if (removal > 0) {
    const removalStr = removalWords[removal] || `${removal} times`;
    name += ` ${removalStr} removed`;
  }

  return name;
}
```

### 4.3 Relationship Qualifiers

```typescript
function addQualifiers(baseName: string, qualifiers: Qualifiers): string {
  let result = baseName;

  if (qualifiers.isHalf) result = `half-${result}`;
  if (qualifiers.isStep) result = `step-${result}`;
  if (qualifiers.isAdoptive) result = `adoptive ${result}`;
  if (qualifiers.isInLaw) result = `${result}-in-law`;

  return result;
}

// Examples:
// half-brother, step-mother, adoptive father
// brother-in-law, mother-in-law
// step-grandmother, half-uncle
```

---

## 5. Data Model Changes

### 5.1 Updated Schema

```prisma
// Keep existing Person model, add computed fields

model Person {
  id            String   @id @default(cuid())
  treeId        String
  firstName     String
  lastName      String
  gender        Gender   @default(UNKNOWN)
  birthDate     DateTime?
  deathDate     DateTime?

  // Existing relationships
  relationshipsFrom  Relationship[]  @relation("RelationshipFrom")
  relationshipsTo    Relationship[]  @relation("RelationshipTo")

  // NEW: Computed generation for layout optimization
  computedGeneration Int?

  // Indexes for traversal
  @@index([treeId])
  @@index([treeId, computedGeneration])
}

// Simplified relationship model - only store foundational relationships
model Relationship {
  id               String           @id @default(cuid())
  treeId           String
  personFromId     String
  personToId       String

  // Simplified type - only foundational relationships
  relationshipType FoundationalRelationType

  // Qualifiers stored here
  isAdoptive       Boolean @default(false)
  isStep           Boolean @default(false)
  isFoster         Boolean @default(false)

  // Metadata
  startDate        DateTime?
  endDate          DateTime?
  notes            String?

  personFrom       Person  @relation("RelationshipFrom", fields: [personFromId], references: [id])
  personTo         Person  @relation("RelationshipTo", fields: [personToId], references: [id])

  @@unique([personFromId, personToId, relationshipType])
  @@index([treeId])
  @@index([personFromId])
  @@index([personToId])
}

enum FoundationalRelationType {
  PARENT    // Parent-child (directed: from parent to child)
  SPOUSE    // Marriage/partnership (bidirectional)
  SIBLING   // Optional: for explicit half/step sibling tracking
}

// NEW: Optional cache table for frequently computed relationships
model RelationshipCache {
  id                  String   @id @default(cuid())
  treeId              String
  fromPersonId        String
  toPersonId          String

  // Computed values
  relationshipType    String   // The computed type: "cousin", "aunt", etc.
  displayName         String   // "2nd cousin once removed"
  consanguinity       Int      // Degree of blood relationship
  generationDiff      Int      // Positive = older, negative = younger
  cousinDegree        Int?
  cousinRemoval       Int?

  // Flags
  isBloodRelation     Boolean
  isInLaw             Boolean
  isStep              Boolean
  isHalf              Boolean

  computedAt          DateTime @default(now())

  @@unique([fromPersonId, toPersonId])
  @@index([treeId])
  @@index([fromPersonId])
  @@index([toPersonId])
  @@index([relationshipType])
}
```

### 5.2 In-Memory Graph Structure

```typescript
// Optimized for traversal operations
interface FamilyGraph {
  // Person lookup
  persons: Map<string, Person>;

  // Adjacency lists for O(1) neighbor access
  parentOf: Map<string, Set<string>>;    // personId → children IDs
  childOf: Map<string, Set<string>>;     // personId → parent IDs
  spouseOf: Map<string, Set<string>>;    // personId → spouse IDs

  // Pre-computed for performance
  generationMap: Map<string, number>;    // personId → generation number
}
```

---

## 6. API Design

### 6.1 New Endpoints

```typescript
// Core relationship computation
GET /api/family-trees/:treeId/relationship/:personAId/:personBId
Response: {
  relationship: {
    type: "COUSIN",
    displayName: "2nd cousin once removed",
    consanguinity: 6,
    generationDifference: 1,
    cousinDegree: 2,
    cousinRemoval: 1,
    isBloodRelation: true,
    isInLaw: false,
    isStep: false,
    isHalf: false,
    path: [
      { personId: "...", name: "Alice", relationshipToNext: "parent" },
      { personId: "...", name: "Bob", relationshipToNext: "sibling" },
      // ...
    ]
  }
}

// Find all relatives of a specific type
GET /api/family-trees/:treeId/people/:personId/relatives
Query params:
  - type: "cousin" | "ancestor" | "descendant" | "aunt" | "uncle" | etc.
  - degree: number (for cousins: 1, 2, 3...)
  - removal: number (for cousins: 0, 1, 2...)
  - maxGenerations: number
  - includeInLaws: boolean
  - includeStep: boolean
  - limit: number
  - offset: number

Response: {
  relatives: [
    {
      person: { id, firstName, lastName, ... },
      relationship: { type, displayName, ... }
    }
  ],
  total: 42,
  hasMore: true
}

// Get immediate family (optimized)
GET /api/family-trees/:treeId/people/:personId/family
Response: {
  parents: [...],
  children: [...],
  spouses: [...],
  siblings: [...]
}

// Relationship path visualization
GET /api/family-trees/:treeId/relationship-path/:personAId/:personBId
Response: {
  paths: [
    {
      nodes: [...],
      edges: [...],
      length: 5
    }
  ]
}

// Relationship statistics
GET /api/family-trees/:treeId/people/:personId/relationship-stats
Response: {
  totalRelatives: 234,
  bloodRelatives: 156,
  inLawRelatives: 78,
  generationsUp: 4,
  generationsDown: 3,
  closestCousinDegree: 1,
  furthestRelative: { person: {...}, relationship: {...} }
}
```

### 6.2 Search Capabilities

```typescript
// Universal relationship search
GET /api/family-trees/:treeId/relationship-search
Query params:
  - fromPersonId: string (required)
  - query: string (e.g., "3rd cousin", "great-aunt", "grandfather")

Response: {
  matches: [
    { person: {...}, relationship: {...} }
  ]
}

// "How are we related?" feature
POST /api/family-trees/:treeId/how-related
Body: {
  personIds: ["id1", "id2", ...] // 2+ people
}
Response: {
  relationships: [
    { from: "id1", to: "id2", relationship: {...} },
    { from: "id1", to: "id3", relationship: {...} },
    // ...
  ],
  commonAncestors: [
    { ancestor: {...}, relatedPersons: ["id1", "id2"] }
  ]
}
```

---

## 7. Performance Strategy

### 7.1 Computation Tiers

```
Tier 1: Direct Lookup (< 1ms)
├── Parent/Child (stored)
├── Spouse (stored)
└── Sibling (stored or computed from shared parents)

Tier 2: Single BFS (< 10ms)
├── Grandparent/Grandchild
├── Aunt/Uncle/Nephew/Niece
└── 1st cousins

Tier 3: Common Ancestor Search (< 50ms)
├── Extended cousins (2nd, 3rd, etc.)
├── Removed cousins
└── In-laws

Tier 4: Full Graph Traversal (< 200ms)
├── "Find all X" queries
├── Relationship statistics
└── Path finding
```

### 7.2 Caching Strategy

```typescript
// Three-tier cache
class RelationshipCache {
  // L1: In-memory LRU (hot data)
  private memoryCache: LRUCache<string, ComputedRelationship>;

  // L2: Database cache (warm data)
  private dbCache: RelationshipCache model;

  // L3: Precomputed ancestors (for hub persons)
  private ancestorCache: Map<string, Map<string, number>>;

  // Cache invalidation on relationship changes
  async invalidate(personId: string): Promise<void> {
    // Clear all cached relationships involving this person
    // Cascade to relatives if needed
  }
}
```

### 7.3 Optimization Techniques

1. **Lazy Computation**: Only compute relationships when requested
2. **Batch Queries**: Preload graph data for multiple computations
3. **Generation Indexing**: Pre-compute generation numbers for fast vertical queries
4. **Hub Person Caching**: Cache ancestor sets for frequently accessed people
5. **Partial Graph Loading**: Only load relevant portions of large trees

---

## 8. Implementation Roadmap

### Phase 1: Core Engine (Week 1-2)
```
Files to create:
├── /packages/family-graph/src/index.ts        (exports)
├── /packages/family-graph/src/graph.ts        (FamilyGraph class)
├── /packages/family-graph/src/traversal.ts    (BFS/DFS algorithms)
├── /packages/family-graph/src/ancestors.ts    (Common ancestor finding)
├── /packages/family-graph/src/compute.ts      (Main computation)
└── /packages/family-graph/src/naming.ts       (Relationship naming)

Tasks:
1. Create FamilyGraph class with adjacency list representation
2. Implement BFS ancestor traversal
3. Implement common ancestor algorithm
4. Implement relationship classification logic
5. Implement naming system
```

### Phase 2: API Integration (Week 2-3)
```
Files to modify:
├── /apps/api/src/routes/relationships.ts      (extend)
├── /apps/api/src/routes/familyTrees.ts        (add endpoints)
└── /packages/db/prisma/schema.prisma          (optional cache table)

Tasks:
1. Create relationship computation endpoint
2. Create relative search endpoint
3. Create relationship path endpoint
4. Implement caching layer
5. Add cache invalidation hooks
```

### Phase 3: UI Integration (Week 3-4)
```
Files to modify:
├── /apps/web/src/pages/FamilyTreeEditor.tsx
├── /apps/web/src/components/tree/PersonDetailModal.tsx
└── /apps/web/src/lib/family-tree-layout.ts

Tasks:
1. Update relationship display to use computed names
2. Add "How are we related?" feature
3. Add relationship search UI
4. Add relationship path visualization
5. Update layout to use computed generations
```

### Phase 4: Optimization (Week 4-5)
```
Tasks:
1. Implement three-tier caching
2. Add database indexes
3. Performance testing with large trees
4. Optimize hot paths
5. Add batch computation for bulk queries
```

---

## 9. Automatic Relationship Inference

### When a Person is Added

```typescript
async function onPersonCreated(person: Person, parents?: string[], spouse?: string) {
  // 1. Create foundational relationships
  if (parents) {
    for (const parentId of parents) {
      await createRelationship({
        type: 'PARENT',
        personFromId: parentId,
        personToId: person.id
      });
    }
  }

  if (spouse) {
    await createRelationship({
      type: 'SPOUSE',
      personFromId: person.id,
      personToId: spouse
    });
  }

  // 2. Invalidate caches for affected people
  await invalidateRelationshipCache(person.id);
  if (parents) {
    for (const parentId of parents) {
      await invalidateRelationshipCache(parentId);
    }
  }

  // 3. Recompute generation numbers
  await recomputeGenerations(person.treeId);
}
```

### Automatic Sibling Detection

```typescript
// When parents are set, siblings are automatically detected
function getSiblings(personId: string, graph: FamilyGraph): string[] {
  const myParents = graph.childOf.get(personId) || new Set();
  const siblings = new Set<string>();

  for (const parentId of myParents) {
    const parentChildren = graph.parentOf.get(parentId) || new Set();
    for (const siblingId of parentChildren) {
      if (siblingId !== personId) {
        siblings.add(siblingId);
      }
    }
  }

  return Array.from(siblings);
}

// Distinguish full vs half siblings
function classifySibling(personId: string, siblingId: string, graph: FamilyGraph): 'full' | 'half' {
  const myParents = graph.childOf.get(personId) || new Set();
  const theirParents = graph.childOf.get(siblingId) || new Set();

  const sharedParents = [...myParents].filter(p => theirParents.has(p));

  // Full sibling if they share ALL parents (assuming 2 parents each)
  if (sharedParents.length >= 2) return 'full';
  if (sharedParents.length === 1) return 'half';

  return 'half'; // Default to half if uncertain
}
```

---

## 10. Testing Strategy

### Unit Tests
```typescript
describe('RelationshipComputation', () => {
  test('parent-child relationship', () => {
    const rel = computeRelationship(childId, parentId);
    expect(rel.type).toBe('PARENT');
    expect(rel.displayName).toBe('father');
  });

  test('grandparent relationship', () => {
    const rel = computeRelationship(grandchildId, grandparentId);
    expect(rel.type).toBe('GRANDPARENT');
    expect(rel.displayName).toBe('grandmother');
  });

  test('1st cousin', () => {
    const rel = computeRelationship(cousin1Id, cousin2Id);
    expect(rel.type).toBe('COUSIN');
    expect(rel.cousinDegree).toBe(1);
    expect(rel.cousinRemoval).toBe(0);
    expect(rel.displayName).toBe('1st cousin');
  });

  test('2nd cousin once removed', () => {
    const rel = computeRelationship(person1Id, person2Id);
    expect(rel.cousinDegree).toBe(2);
    expect(rel.cousinRemoval).toBe(1);
    expect(rel.displayName).toBe('2nd cousin once removed');
  });
});
```

### Integration Tests
```typescript
describe('RelationshipAPI', () => {
  test('GET /relationship/:a/:b returns computed relationship', async () => {
    const res = await request(app)
      .get(`/api/family-trees/${treeId}/relationship/${personA}/${personB}`);

    expect(res.status).toBe(200);
    expect(res.body.relationship).toBeDefined();
    expect(res.body.relationship.displayName).toBe('uncle');
  });

  test('GET /relatives?type=cousin returns all cousins', async () => {
    const res = await request(app)
      .get(`/api/family-trees/${treeId}/people/${personId}/relatives?type=cousin`);

    expect(res.status).toBe(200);
    expect(res.body.relatives.length).toBeGreaterThan(0);
  });
});
```

### Performance Tests
```typescript
describe('Performance', () => {
  test('handles 10,000 person tree', async () => {
    const start = Date.now();
    const rel = await computeRelationship(person1, person2);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100); // < 100ms
  });

  test('batch cousin query completes in reasonable time', async () => {
    const start = Date.now();
    const cousins = await findAllCousins(personId, { degree: 3 });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(500); // < 500ms for all 3rd cousins
  });
});
```

---

## 11. Future Enhancements

### DNA Integration
- Link relationship computation to DNA match percentages
- Validate relationships against expected DNA sharing
- Suggest possible relationships based on DNA matches

### Multiple Relationship Paths
- When two people are related in multiple ways (e.g., married to cousin)
- Display all relationship paths, not just the closest

### Cultural Variations
- Support different kinship systems (e.g., Hawaiian, Eskimo, Sudanese)
- Localized relationship names

### Historical Accuracy
- Handle historical naming conventions
- Support title-based relationships (e.g., "Lord", "Baron")

---

## 12. Summary

This relationship model transforms the family tree application from a manual linking system to an intelligent relationship engine that:

1. **Stores Minimal Data**: Only parent-child and spouse relationships
2. **Computes Everything Else**: All extended family relationships derived automatically
3. **Names Relationships Correctly**: Following standard genealogical terminology
4. **Scales Efficiently**: Handles large trees with caching and optimization
5. **Enables Discovery**: Powerful search for finding relatives of any type

The key insight is that genealogical relationships follow mathematical rules based on paths through a family graph. By implementing the common ancestor algorithm with proper classification and naming, we can answer any "How are we related?" question instantly.
