/**
 * Type definitions for the family graph relationship computation engine.
 */

/**
 * Gender enum matching the Prisma schema
 */
export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';

/**
 * Minimal person data needed for relationship computation
 */
export interface PersonNode {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  birthDate?: Date | null;
  deathDate?: Date | null;
}

/**
 * Foundational relationship types that are stored in the database.
 * All other relationships are computed from these.
 */
export type FoundationalRelationType =
  | 'PARENT'
  | 'CHILD'
  | 'SPOUSE'
  | 'SIBLING'
  | 'ADOPTIVE_PARENT'
  | 'ADOPTIVE_CHILD'
  | 'STEP_PARENT'
  | 'STEP_CHILD'
  | 'FOSTER_PARENT'
  | 'FOSTER_CHILD'
  | 'GUARDIAN'
  | 'WARD';

/**
 * Stored relationship from database
 */
export interface StoredRelationship {
  id: string;
  personFromId: string;
  personToId: string;
  relationshipType: FoundationalRelationType;
  notes?: string | null;
  birthOrder?: number | null;
}

/**
 * Computed/derived relationship types
 */
export type DerivedRelationType =
  // Self
  | 'SELF'
  // Direct lineage
  | 'PARENT' | 'MOTHER' | 'FATHER'
  | 'CHILD' | 'SON' | 'DAUGHTER'
  | 'GRANDPARENT' | 'GRANDMOTHER' | 'GRANDFATHER'
  | 'GRANDCHILD' | 'GRANDSON' | 'GRANDDAUGHTER'
  | 'GREAT_GRANDPARENT' | 'GREAT_GRANDMOTHER' | 'GREAT_GRANDFATHER'
  | 'GREAT_GRANDCHILD' | 'GREAT_GRANDSON' | 'GREAT_GRANDDAUGHTER'
  | 'ANCESTOR' | 'DESCENDANT'
  // Siblings
  | 'SIBLING' | 'BROTHER' | 'SISTER'
  | 'HALF_SIBLING' | 'HALF_BROTHER' | 'HALF_SISTER'
  | 'STEP_SIBLING' | 'STEP_BROTHER' | 'STEP_SISTER'
  // Extended family
  | 'UNCLE' | 'AUNT' | 'PIBLING'  // pibling = parent's sibling (gender-neutral)
  | 'NEPHEW' | 'NIECE' | 'NIBLING'  // nibling = sibling's child (gender-neutral)
  | 'COUSIN'
  | 'GREAT_UNCLE' | 'GREAT_AUNT' | 'GREAT_PIBLING'
  | 'GREAT_NEPHEW' | 'GREAT_NIECE' | 'GREAT_NIBLING'
  // In-laws
  | 'PARENT_IN_LAW' | 'MOTHER_IN_LAW' | 'FATHER_IN_LAW'
  | 'CHILD_IN_LAW' | 'SON_IN_LAW' | 'DAUGHTER_IN_LAW'
  | 'SIBLING_IN_LAW' | 'BROTHER_IN_LAW' | 'SISTER_IN_LAW'
  // Spouse
  | 'SPOUSE' | 'HUSBAND' | 'WIFE' | 'PARTNER'
  // Step relationships
  | 'STEP_PARENT' | 'STEP_MOTHER' | 'STEP_FATHER'
  | 'STEP_CHILD' | 'STEP_SON' | 'STEP_DAUGHTER'
  // No relationship
  | 'UNRELATED';

/**
 * Qualifiers that modify the base relationship
 */
export interface RelationshipQualifiers {
  isHalf: boolean;
  isStep: boolean;
  isAdoptive: boolean;
  isInLaw: boolean;
  isFoster: boolean;
}

/**
 * A single edge in a relationship path
 */
export interface PathEdge {
  fromId: string;
  toId: string;
  relationshipType: FoundationalRelationType;
}

/**
 * A path through the family tree connecting two people
 */
export interface RelationshipPath {
  nodes: string[];  // Person IDs in order from A to B
  edges: PathEdge[];
  length: number;
  pathType: 'blood' | 'marriage' | 'mixed';
}

/**
 * Common ancestor shared by two people
 */
export interface CommonAncestor {
  ancestorId: string;
  ancestor?: PersonNode;
  distanceFromA: number;  // Generations from person A to ancestor
  distanceFromB: number;  // Generations from person B to ancestor
  totalDistance: number;  // Sum of both distances
}

/**
 * Full computed relationship between two people
 */
export interface ComputedRelationship {
  fromPersonId: string;
  toPersonId: string;
  fromPerson?: PersonNode;
  toPerson?: PersonNode;

  // Primary classification
  type: DerivedRelationType;
  displayName: string;  // Human-readable: "2nd cousin once removed"

  // Genealogical metrics
  consanguinity: number;  // Degree of blood relationship (0 = none/in-law)
  generationDifference: number;  // Positive = toPerson is older, negative = younger

  // Cousin-specific (only set for cousin relationships)
  cousinDegree?: number;  // 1st, 2nd, 3rd cousin, etc.
  cousinRemoval?: number;  // Times removed (generational offset)

  // Path information
  commonAncestors: CommonAncestor[];
  shortestPath?: RelationshipPath;

  // Relationship qualifiers
  qualifiers: RelationshipQualifiers;

  // Convenience booleans
  isBloodRelation: boolean;
  isDirectAncestor: boolean;  // Is toPerson an ancestor of fromPerson?
  isDirectDescendant: boolean;  // Is toPerson a descendant of fromPerson?
}

/**
 * Options for relative search queries
 */
export interface RelativeSearchOptions {
  type?: DerivedRelationType;
  cousinDegree?: number;
  cousinRemoval?: number;
  maxGenerations?: number;
  includeInLaws?: boolean;
  includeStep?: boolean;
  includeHalf?: boolean;
  includeAdoptive?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Result of a relative search
 */
export interface RelativeSearchResult {
  person: PersonNode;
  relationship: ComputedRelationship;
}

/**
 * Immediate family structure
 */
export interface ImmediateFamily {
  person: PersonNode;
  parents: RelativeSearchResult[];
  children: RelativeSearchResult[];
  spouses: RelativeSearchResult[];
  siblings: RelativeSearchResult[];
}

/**
 * Statistics about a person's relationships
 */
export interface RelationshipStats {
  totalRelatives: number;
  bloodRelatives: number;
  inLawRelatives: number;
  generationsUp: number;  // How many ancestor generations
  generationsDown: number;  // How many descendant generations
  closestCousinDegree?: number;
  furthestRelative?: {
    person: PersonNode;
    distance: number;
  };
}
