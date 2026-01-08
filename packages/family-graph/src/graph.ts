/**
 * FamilyGraph - In-memory graph representation for efficient relationship traversal.
 *
 * Uses adjacency lists for O(1) neighbor lookups.
 * Designed to be built from database records and used for relationship computation.
 */

import type {
  PersonNode,
  StoredRelationship,
  FoundationalRelationType,
  Gender,
} from './types.js';

/**
 * Parent-type relationships (person is parent of related person)
 */
const PARENT_TYPES: FoundationalRelationType[] = [
  'PARENT',
  'ADOPTIVE_PARENT',
  'STEP_PARENT',
  'FOSTER_PARENT',
  'GUARDIAN',
];

/**
 * Child-type relationships (person is child of related person)
 */
const CHILD_TYPES: FoundationalRelationType[] = [
  'CHILD',
  'ADOPTIVE_CHILD',
  'STEP_CHILD',
  'FOSTER_CHILD',
  'WARD',
];

/**
 * Sibling-type relationships
 */
const SIBLING_TYPES: FoundationalRelationType[] = ['SIBLING'];

/**
 * Spouse-type relationships
 */
const SPOUSE_TYPES: FoundationalRelationType[] = ['SPOUSE'];

/**
 * Relationship metadata stored in edge
 */
export interface EdgeMetadata {
  relationshipType: FoundationalRelationType;
  relationshipId?: string;
  isAdoptive: boolean;
  isStep: boolean;
  isFoster: boolean;
  birthOrder?: number;
}

/**
 * Edge in the family graph
 */
export interface GraphEdge {
  fromId: string;
  toId: string;
  metadata: EdgeMetadata;
}

/**
 * FamilyGraph class for efficient relationship traversal
 */
export class FamilyGraph {
  // Person lookup by ID
  private persons: Map<string, PersonNode>;

  // Adjacency lists for different relationship types
  // parentOf: personId -> Set of children IDs (person is parent of these people)
  private parentOf: Map<string, Map<string, EdgeMetadata>>;

  // childOf: personId -> Set of parent IDs (person is child of these people)
  private childOf: Map<string, Map<string, EdgeMetadata>>;

  // spouseOf: personId -> Set of spouse IDs (bidirectional)
  private spouseOf: Map<string, Map<string, EdgeMetadata>>;

  // siblingOf: personId -> Set of sibling IDs (bidirectional)
  private siblingOf: Map<string, Map<string, EdgeMetadata>>;

  constructor() {
    this.persons = new Map();
    this.parentOf = new Map();
    this.childOf = new Map();
    this.spouseOf = new Map();
    this.siblingOf = new Map();
  }

  /**
   * Build a FamilyGraph from database records.
   * This is the primary way to construct a graph.
   */
  static fromData(
    persons: PersonNode[],
    relationships: StoredRelationship[]
  ): FamilyGraph {
    const graph = new FamilyGraph();

    // Index all persons
    for (const person of persons) {
      graph.addPerson(person);
    }

    // Build edges from relationships
    for (const rel of relationships) {
      graph.addRelationship(rel);
    }

    return graph;
  }

  /**
   * Add a person to the graph
   */
  addPerson(person: PersonNode): void {
    this.persons.set(person.id, person);

    // Initialize empty adjacency sets
    if (!this.parentOf.has(person.id)) {
      this.parentOf.set(person.id, new Map());
    }
    if (!this.childOf.has(person.id)) {
      this.childOf.set(person.id, new Map());
    }
    if (!this.spouseOf.has(person.id)) {
      this.spouseOf.set(person.id, new Map());
    }
    if (!this.siblingOf.has(person.id)) {
      this.siblingOf.set(person.id, new Map());
    }
  }

  /**
   * Add a relationship to the graph
   */
  addRelationship(rel: StoredRelationship): void {
    const metadata: EdgeMetadata = {
      relationshipType: rel.relationshipType,
      relationshipId: rel.id,
      isAdoptive: rel.relationshipType.includes('ADOPTIVE'),
      isStep: rel.relationshipType.includes('STEP'),
      isFoster: rel.relationshipType.includes('FOSTER') || rel.relationshipType === 'GUARDIAN' || rel.relationshipType === 'WARD',
      birthOrder: rel.birthOrder ?? undefined,
    };

    // Ensure both persons exist in adjacency maps
    this.ensurePersonExists(rel.personFromId);
    this.ensurePersonExists(rel.personToId);

    if (PARENT_TYPES.includes(rel.relationshipType)) {
      // PARENT-type: personFrom is parent of personTo
      // So personFrom has personTo as child
      this.parentOf.get(rel.personFromId)!.set(rel.personToId, metadata);
      // And personTo has personFrom as parent
      this.childOf.get(rel.personToId)!.set(rel.personFromId, metadata);
    } else if (CHILD_TYPES.includes(rel.relationshipType)) {
      // CHILD-type: personFrom is child of personTo
      // So personFrom has personTo as parent
      this.childOf.get(rel.personFromId)!.set(rel.personToId, metadata);
      // And personTo has personFrom as child
      this.parentOf.get(rel.personToId)!.set(rel.personFromId, metadata);
    } else if (SPOUSE_TYPES.includes(rel.relationshipType)) {
      // SPOUSE: bidirectional
      this.spouseOf.get(rel.personFromId)!.set(rel.personToId, metadata);
      this.spouseOf.get(rel.personToId)!.set(rel.personFromId, metadata);
    } else if (SIBLING_TYPES.includes(rel.relationshipType)) {
      // SIBLING: bidirectional
      this.siblingOf.get(rel.personFromId)!.set(rel.personToId, metadata);
      this.siblingOf.get(rel.personToId)!.set(rel.personFromId, metadata);
    }
  }

  /**
   * Ensure a person ID has initialized adjacency maps
   */
  private ensurePersonExists(personId: string): void {
    if (!this.parentOf.has(personId)) {
      this.parentOf.set(personId, new Map());
    }
    if (!this.childOf.has(personId)) {
      this.childOf.set(personId, new Map());
    }
    if (!this.spouseOf.has(personId)) {
      this.spouseOf.set(personId, new Map());
    }
    if (!this.siblingOf.has(personId)) {
      this.siblingOf.set(personId, new Map());
    }
  }

  /**
   * Get a person by ID
   */
  getPerson(personId: string): PersonNode | undefined {
    return this.persons.get(personId);
  }

  /**
   * Check if a person exists in the graph
   */
  hasPerson(personId: string): boolean {
    return this.persons.has(personId);
  }

  /**
   * Get all persons in the graph
   */
  getAllPersons(): PersonNode[] {
    return Array.from(this.persons.values());
  }

  /**
   * Get all person IDs in the graph
   */
  getAllPersonIds(): string[] {
    return Array.from(this.persons.keys());
  }

  /**
   * Get the number of persons in the graph
   */
  get size(): number {
    return this.persons.size;
  }

  /**
   * Get all parents of a person (biological, adoptive, step, foster)
   */
  getParents(personId: string): Array<{ person: PersonNode; metadata: EdgeMetadata }> {
    const parentMap = this.childOf.get(personId);
    if (!parentMap) return [];

    return Array.from(parentMap.entries())
      .map(([parentId, metadata]) => {
        const person = this.persons.get(parentId);
        return person ? { person, metadata } : null;
      })
      .filter((p): p is { person: PersonNode; metadata: EdgeMetadata } => p !== null);
  }

  /**
   * Get biological parents only (excludes step, adoptive, foster)
   */
  getBiologicalParents(personId: string): PersonNode[] {
    const parentMap = this.childOf.get(personId);
    if (!parentMap) return [];

    return Array.from(parentMap.entries())
      .filter(([_, metadata]) =>
        !metadata.isAdoptive && !metadata.isStep && !metadata.isFoster
      )
      .map(([parentId]) => this.persons.get(parentId))
      .filter((p): p is PersonNode => p !== undefined);
  }

  /**
   * Get parent IDs only (for efficient traversal)
   */
  getParentIds(personId: string): string[] {
    const parentMap = this.childOf.get(personId);
    return parentMap ? Array.from(parentMap.keys()) : [];
  }

  /**
   * Get biological parent IDs only
   */
  getBiologicalParentIds(personId: string): string[] {
    const parentMap = this.childOf.get(personId);
    if (!parentMap) return [];

    return Array.from(parentMap.entries())
      .filter(([_, metadata]) =>
        !metadata.isAdoptive && !metadata.isStep && !metadata.isFoster
      )
      .map(([parentId]) => parentId);
  }

  /**
   * Get all children of a person
   */
  getChildren(personId: string): Array<{ person: PersonNode; metadata: EdgeMetadata }> {
    const childMap = this.parentOf.get(personId);
    if (!childMap) return [];

    return Array.from(childMap.entries())
      .map(([childId, metadata]) => {
        const person = this.persons.get(childId);
        return person ? { person, metadata } : null;
      })
      .filter((p): p is { person: PersonNode; metadata: EdgeMetadata } => p !== null);
  }

  /**
   * Get child IDs only (for efficient traversal)
   */
  getChildIds(personId: string): string[] {
    const childMap = this.parentOf.get(personId);
    return childMap ? Array.from(childMap.keys()) : [];
  }

  /**
   * Get all spouses of a person
   */
  getSpouses(personId: string): Array<{ person: PersonNode; metadata: EdgeMetadata }> {
    const spouseMap = this.spouseOf.get(personId);
    if (!spouseMap) return [];

    return Array.from(spouseMap.entries())
      .map(([spouseId, metadata]) => {
        const person = this.persons.get(spouseId);
        return person ? { person, metadata } : null;
      })
      .filter((p): p is { person: PersonNode; metadata: EdgeMetadata } => p !== null);
  }

  /**
   * Get spouse IDs only
   */
  getSpouseIds(personId: string): string[] {
    const spouseMap = this.spouseOf.get(personId);
    return spouseMap ? Array.from(spouseMap.keys()) : [];
  }

  /**
   * Get explicit siblings (stored in database)
   */
  getExplicitSiblings(personId: string): Array<{ person: PersonNode; metadata: EdgeMetadata }> {
    const siblingMap = this.siblingOf.get(personId);
    if (!siblingMap) return [];

    return Array.from(siblingMap.entries())
      .map(([siblingId, metadata]) => {
        const person = this.persons.get(siblingId);
        return person ? { person, metadata } : null;
      })
      .filter((p): p is { person: PersonNode; metadata: EdgeMetadata } => p !== null);
  }

  /**
   * Get all siblings (computed from shared parents + explicit)
   * Returns siblings with classification (full, half, step)
   */
  getSiblings(personId: string): Array<{
    person: PersonNode;
    siblingType: 'full' | 'half' | 'step';
    sharedParentIds: string[];
  }> {
    const siblings = new Map<string, {
      person: PersonNode;
      siblingType: 'full' | 'half' | 'step';
      sharedParentIds: string[];
    }>();

    // Get this person's biological parents
    const myBioParents = new Set(this.getBiologicalParentIds(personId));
    const myAllParents = new Set(this.getParentIds(personId));

    // Find siblings through shared parents
    for (const parentId of myAllParents) {
      const parentChildren = this.getChildIds(parentId);
      const parentMetadata = this.childOf.get(personId)?.get(parentId);
      const isStepParent = parentMetadata?.isStep ?? false;

      for (const siblingId of parentChildren) {
        if (siblingId === personId) continue;
        if (siblings.has(siblingId)) {
          // Already found this sibling, add shared parent
          siblings.get(siblingId)!.sharedParentIds.push(parentId);
          continue;
        }

        const siblingPerson = this.persons.get(siblingId);
        if (!siblingPerson) continue;

        // Determine sibling type
        const siblingBioParents = new Set(this.getBiologicalParentIds(siblingId));
        const sharedBioParents = [...myBioParents].filter(p => siblingBioParents.has(p));

        let siblingType: 'full' | 'half' | 'step';
        if (isStepParent) {
          siblingType = 'step';
        } else if (sharedBioParents.length >= 2) {
          siblingType = 'full';
        } else if (sharedBioParents.length === 1) {
          siblingType = 'half';
        } else {
          siblingType = 'step';
        }

        siblings.set(siblingId, {
          person: siblingPerson,
          siblingType,
          sharedParentIds: [parentId],
        });
      }
    }

    // Upgrade half-siblings to full if they share 2+ parents
    for (const sibling of siblings.values()) {
      if (sibling.siblingType === 'half' && sibling.sharedParentIds.length >= 2) {
        sibling.siblingType = 'full';
      }
    }

    return Array.from(siblings.values());
  }

  /**
   * Get sibling IDs only
   */
  getSiblingIds(personId: string): string[] {
    return this.getSiblings(personId).map(s => s.person.id);
  }

  /**
   * Check if person A is a parent of person B
   */
  isParentOf(parentId: string, childId: string): boolean {
    return this.parentOf.get(parentId)?.has(childId) ?? false;
  }

  /**
   * Check if person A is a child of person B
   */
  isChildOf(childId: string, parentId: string): boolean {
    return this.childOf.get(childId)?.has(parentId) ?? false;
  }

  /**
   * Check if two people are spouses
   */
  areSpouses(personAId: string, personBId: string): boolean {
    return this.spouseOf.get(personAId)?.has(personBId) ?? false;
  }

  /**
   * Check if two people are siblings
   */
  areSiblings(personAId: string, personBId: string): boolean {
    const siblings = this.getSiblingIds(personAId);
    return siblings.includes(personBId);
  }

  /**
   * Get the edge metadata between two people (if directly connected)
   */
  getDirectRelationship(personAId: string, personBId: string): EdgeMetadata | null {
    // Check parent-child
    const asParent = this.parentOf.get(personAId)?.get(personBId);
    if (asParent) return asParent;

    const asChild = this.childOf.get(personAId)?.get(personBId);
    if (asChild) return asChild;

    // Check spouse
    const asSpouse = this.spouseOf.get(personAId)?.get(personBId);
    if (asSpouse) return asSpouse;

    // Check explicit sibling
    const asSibling = this.siblingOf.get(personAId)?.get(personBId);
    if (asSibling) return asSibling;

    return null;
  }

  /**
   * Get all direct connections for a person (for BFS traversal)
   */
  getAllConnections(personId: string): Array<{
    personId: string;
    connectionType: 'parent' | 'child' | 'spouse' | 'sibling';
    metadata: EdgeMetadata;
  }> {
    const connections: Array<{
      personId: string;
      connectionType: 'parent' | 'child' | 'spouse' | 'sibling';
      metadata: EdgeMetadata;
    }> = [];

    // Parents
    const parents = this.childOf.get(personId);
    if (parents) {
      for (const [parentId, metadata] of parents) {
        connections.push({ personId: parentId, connectionType: 'parent', metadata });
      }
    }

    // Children
    const children = this.parentOf.get(personId);
    if (children) {
      for (const [childId, metadata] of children) {
        connections.push({ personId: childId, connectionType: 'child', metadata });
      }
    }

    // Spouses
    const spouses = this.spouseOf.get(personId);
    if (spouses) {
      for (const [spouseId, metadata] of spouses) {
        connections.push({ personId: spouseId, connectionType: 'spouse', metadata });
      }
    }

    // Explicit siblings
    const siblings = this.siblingOf.get(personId);
    if (siblings) {
      for (const [siblingId, metadata] of siblings) {
        connections.push({ personId: siblingId, connectionType: 'sibling', metadata });
      }
    }

    return connections;
  }
}

export { PARENT_TYPES, CHILD_TYPES, SIBLING_TYPES, SPOUSE_TYPES };
