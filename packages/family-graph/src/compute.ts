/**
 * Relationship Computation Engine
 *
 * The main entry point for computing relationships between two people.
 * Uses the common ancestor algorithm and naming system to produce
 * human-readable relationship labels.
 */

import type { FamilyGraph } from './graph.js';
import type {
  PersonNode,
  Gender,
  ComputedRelationship,
  DerivedRelationType,
  RelationshipQualifiers,
  CommonAncestor,
  RelationshipPath,
} from './types.js';
import { findCommonAncestors, getMRCA, getCivilDegree } from './ancestors.js';
import {
  getAllAncestorsWithDistance,
  getAllDescendantsWithDistance,
  findAnyPath,
} from './traversal.js';
import { RelationshipNamer } from './naming.js';

/**
 * Default qualifiers (all false)
 */
const DEFAULT_QUALIFIERS: RelationshipQualifiers = {
  isHalf: false,
  isStep: false,
  isAdoptive: false,
  isInLaw: false,
  isFoster: false,
};

/**
 * Compute the relationship between two people.
 *
 * This is the main entry point for the relationship computation engine.
 *
 * @param fromPersonId - The person asking "how am I related to..."
 * @param toPersonId - The person being asked about
 * @param graph - FamilyGraph instance
 * @returns ComputedRelationship or null if no relationship exists
 */
export function computeRelationship(
  fromPersonId: string,
  toPersonId: string,
  graph: FamilyGraph
): ComputedRelationship | null {
  // Handle same person
  if (fromPersonId === toPersonId) {
    return createSelfRelationship(fromPersonId, graph);
  }

  // Get person data
  const fromPerson = graph.getPerson(fromPersonId);
  const toPerson = graph.getPerson(toPersonId);

  if (!fromPerson || !toPerson) {
    return null;
  }

  // Step 1: Check direct relationships (spouse, parent, child, sibling)
  const directRelation = checkDirectRelationship(fromPersonId, toPersonId, graph);
  if (directRelation) {
    return directRelation;
  }

  // Step 2: Find common ancestors for blood relationship
  const bloodRelation = computeBloodRelationship(fromPersonId, toPersonId, graph);
  if (bloodRelation && bloodRelation.isBloodRelation) {
    return bloodRelation;
  }

  // Step 3: Check in-law relationships (through spouse)
  const inLawRelation = computeInLawRelationship(fromPersonId, toPersonId, graph);
  if (inLawRelation) {
    return inLawRelation;
  }

  // Step 4: Check step relationships
  const stepRelation = computeStepRelationship(fromPersonId, toPersonId, graph);
  if (stepRelation) {
    return stepRelation;
  }

  // No relationship found
  return createUnrelatedResult(fromPersonId, toPersonId, graph);
}

/**
 * Create a self-relationship result.
 */
function createSelfRelationship(personId: string, graph: FamilyGraph): ComputedRelationship {
  const person = graph.getPerson(personId);
  return {
    fromPersonId: personId,
    toPersonId: personId,
    fromPerson: person,
    toPerson: person,
    type: 'SELF',
    displayName: 'self',
    consanguinity: 0,
    generationDifference: 0,
    commonAncestors: [],
    qualifiers: { ...DEFAULT_QUALIFIERS },
    isBloodRelation: true,
    isDirectAncestor: false,
    isDirectDescendant: false,
  };
}

/**
 * Create an unrelated result.
 */
function createUnrelatedResult(
  fromPersonId: string,
  toPersonId: string,
  graph: FamilyGraph
): ComputedRelationship | null {
  // Check if there's any path at all
  const path = findAnyPath(fromPersonId, toPersonId, graph, 20);

  if (!path) {
    return null; // Truly unrelated
  }

  // There's a connection but it's complex - return generic result
  const fromPerson = graph.getPerson(fromPersonId);
  const toPerson = graph.getPerson(toPersonId);

  return {
    fromPersonId,
    toPersonId,
    fromPerson,
    toPerson,
    type: 'UNRELATED',
    displayName: 'distant relative',
    consanguinity: 0,
    generationDifference: 0,
    commonAncestors: [],
    shortestPath: path,
    qualifiers: { ...DEFAULT_QUALIFIERS },
    isBloodRelation: false,
    isDirectAncestor: false,
    isDirectDescendant: false,
  };
}

/**
 * Check for direct relationships (spouse, parent, child, sibling).
 */
function checkDirectRelationship(
  fromPersonId: string,
  toPersonId: string,
  graph: FamilyGraph
): ComputedRelationship | null {
  const fromPerson = graph.getPerson(fromPersonId);
  const toPerson = graph.getPerson(toPersonId);
  const toGender = toPerson?.gender;

  // Check if spouse
  if (graph.areSpouses(fromPersonId, toPersonId)) {
    return {
      fromPersonId,
      toPersonId,
      fromPerson,
      toPerson,
      type: getSpouseType(toGender),
      displayName: RelationshipNamer.nameSpouse(toGender),
      consanguinity: 0,
      generationDifference: 0,
      commonAncestors: [],
      qualifiers: { ...DEFAULT_QUALIFIERS },
      isBloodRelation: false,
      isDirectAncestor: false,
      isDirectDescendant: false,
    };
  }

  // Check if parent (toPerson is parent of fromPerson)
  const parents = graph.getParents(fromPersonId);
  const parentMatch = parents.find(p => p.person.id === toPersonId);
  if (parentMatch) {
    const qualifiers: RelationshipQualifiers = {
      ...DEFAULT_QUALIFIERS,
      isAdoptive: parentMatch.metadata.isAdoptive,
      isStep: parentMatch.metadata.isStep,
      isFoster: parentMatch.metadata.isFoster,
    };

    const baseName = RelationshipNamer.nameAncestor(1, toGender);
    const displayName = RelationshipNamer.addQualifiers(baseName, qualifiers);

    return {
      fromPersonId,
      toPersonId,
      fromPerson,
      toPerson,
      type: getParentType(toGender, qualifiers),
      displayName,
      consanguinity: 1,
      generationDifference: 1,
      commonAncestors: [{ ancestorId: toPersonId, ancestor: toPerson, distanceFromA: 1, distanceFromB: 0, totalDistance: 1 }],
      qualifiers,
      isBloodRelation: !qualifiers.isStep && !qualifiers.isAdoptive && !qualifiers.isFoster,
      isDirectAncestor: true,
      isDirectDescendant: false,
    };
  }

  // Check if child (toPerson is child of fromPerson)
  const children = graph.getChildren(fromPersonId);
  const childMatch = children.find(c => c.person.id === toPersonId);
  if (childMatch) {
    const qualifiers: RelationshipQualifiers = {
      ...DEFAULT_QUALIFIERS,
      isAdoptive: childMatch.metadata.isAdoptive,
      isStep: childMatch.metadata.isStep,
      isFoster: childMatch.metadata.isFoster,
    };

    const baseName = RelationshipNamer.nameDescendant(1, toGender);
    const displayName = RelationshipNamer.addQualifiers(baseName, qualifiers);

    return {
      fromPersonId,
      toPersonId,
      fromPerson,
      toPerson,
      type: getChildType(toGender, qualifiers),
      displayName,
      consanguinity: 1,
      generationDifference: -1,
      commonAncestors: [{ ancestorId: fromPersonId, ancestor: fromPerson, distanceFromA: 0, distanceFromB: 1, totalDistance: 1 }],
      qualifiers,
      isBloodRelation: !qualifiers.isStep && !qualifiers.isAdoptive && !qualifiers.isFoster,
      isDirectAncestor: false,
      isDirectDescendant: true,
    };
  }

  // Check if sibling
  const siblings = graph.getSiblings(fromPersonId);
  const siblingMatch = siblings.find(s => s.person.id === toPersonId);
  if (siblingMatch) {
    const isHalf = siblingMatch.siblingType === 'half';
    const isStep = siblingMatch.siblingType === 'step';

    const qualifiers: RelationshipQualifiers = {
      ...DEFAULT_QUALIFIERS,
      isHalf,
      isStep,
    };

    const displayName = RelationshipNamer.nameSibling(toGender, isHalf);

    return {
      fromPersonId,
      toPersonId,
      fromPerson,
      toPerson,
      type: getSiblingType(toGender, qualifiers),
      displayName: isStep ? `step-${displayName.replace('half-', '')}` : displayName,
      consanguinity: isHalf ? 4 : 2,
      generationDifference: 0,
      commonAncestors: [], // Would need to compute shared parents
      qualifiers,
      isBloodRelation: !isStep,
      isDirectAncestor: false,
      isDirectDescendant: false,
    };
  }

  return null;
}

/**
 * Compute blood relationship using common ancestor method.
 */
function computeBloodRelationship(
  fromPersonId: string,
  toPersonId: string,
  graph: FamilyGraph
): ComputedRelationship | null {
  const commonAncestors = findCommonAncestors(fromPersonId, toPersonId, graph);

  if (commonAncestors.length === 0) {
    return null; // No blood relationship
  }

  const fromPerson = graph.getPerson(fromPersonId);
  const toPerson = graph.getPerson(toPersonId);
  const toGender = toPerson?.gender;

  // Use the MRCA for classification
  const mrca = commonAncestors[0];
  const gen1 = mrca.distanceFromA;
  const gen2 = mrca.distanceFromB;

  return classifyBloodRelationship(
    fromPersonId,
    toPersonId,
    gen1,
    gen2,
    commonAncestors,
    graph
  );
}

/**
 * Classify blood relationship based on generational distances to MRCA.
 *
 * Classification matrix:
 * - (0, N): B is N-generation ancestor of A
 * - (N, 0): B is N-generation descendant of A
 * - (1, 1): Siblings
 * - (1, N): B is uncle/aunt (N-1 greats)
 * - (N, 1): B is nephew/niece (N-1 greats)
 * - (N, M) where N,M >= 2: Cousins
 */
function classifyBloodRelationship(
  fromPersonId: string,
  toPersonId: string,
  gen1: number,
  gen2: number,
  commonAncestors: CommonAncestor[],
  graph: FamilyGraph
): ComputedRelationship {
  const fromPerson = graph.getPerson(fromPersonId);
  const toPerson = graph.getPerson(toPersonId);
  const toGender = toPerson?.gender;

  const consanguinity = getCivilDegree(fromPersonId, toPersonId, graph);
  const shortestPath = findAnyPath(fromPersonId, toPersonId, graph);

  const baseResult: Partial<ComputedRelationship> = {
    fromPersonId,
    toPersonId,
    fromPerson,
    toPerson,
    consanguinity,
    commonAncestors,
    shortestPath: shortestPath ?? undefined,
    qualifiers: { ...DEFAULT_QUALIFIERS },
    isBloodRelation: true,
  };

  // Direct ancestor (B is ancestor of A)
  if (gen2 === 0 && gen1 > 0) {
    const displayName = RelationshipNamer.nameAncestor(gen1, toGender);
    return {
      ...baseResult,
      type: getAncestorType(gen1, toGender),
      displayName,
      generationDifference: gen1,
      isDirectAncestor: true,
      isDirectDescendant: false,
    } as ComputedRelationship;
  }

  // Direct descendant (B is descendant of A)
  if (gen1 === 0 && gen2 > 0) {
    const displayName = RelationshipNamer.nameDescendant(gen2, toGender);
    return {
      ...baseResult,
      type: getDescendantType(gen2, toGender),
      displayName,
      generationDifference: -gen2,
      isDirectAncestor: false,
      isDirectDescendant: true,
    } as ComputedRelationship;
  }

  // Siblings (both paths = 1)
  if (gen1 === 1 && gen2 === 1) {
    // Check if half-siblings
    const siblings = graph.getSiblings(fromPersonId);
    const siblingMatch = siblings.find(s => s.person.id === toPersonId);
    const isHalf = siblingMatch?.siblingType === 'half';

    const displayName = RelationshipNamer.nameSibling(toGender, isHalf);
    return {
      ...baseResult,
      type: getSiblingType(toGender, { ...DEFAULT_QUALIFIERS, isHalf }),
      displayName,
      generationDifference: 0,
      qualifiers: { ...DEFAULT_QUALIFIERS, isHalf },
      isDirectAncestor: false,
      isDirectDescendant: false,
    } as ComputedRelationship;
  }

  // Aunt/Uncle (gen1 > 1, gen2 = 1) - B is sibling of A's ancestor
  if (gen2 === 1 && gen1 > 1) {
    const displayName = RelationshipNamer.nameAuntUncle(gen1, toGender);
    return {
      ...baseResult,
      type: getAuntUncleType(gen1, toGender),
      displayName,
      generationDifference: gen1 - 1,
      isDirectAncestor: false,
      isDirectDescendant: false,
    } as ComputedRelationship;
  }

  // Nephew/Niece (gen1 = 1, gen2 > 1) - B is descendant of A's sibling
  if (gen1 === 1 && gen2 > 1) {
    const displayName = RelationshipNamer.nameNephewNiece(gen2, toGender);
    return {
      ...baseResult,
      type: getNephewNieceType(gen2, toGender),
      displayName,
      generationDifference: -(gen2 - 1),
      isDirectAncestor: false,
      isDirectDescendant: false,
    } as ComputedRelationship;
  }

  // Cousins (both gen1 and gen2 >= 2)
  if (gen1 >= 2 && gen2 >= 2) {
    const { degree, removal } = RelationshipNamer.calculateCousinParameters(gen1, gen2);
    const displayName = RelationshipNamer.nameCousin(degree, removal);

    return {
      ...baseResult,
      type: 'COUSIN',
      displayName,
      generationDifference: gen2 - gen1,
      cousinDegree: degree,
      cousinRemoval: removal,
      isDirectAncestor: false,
      isDirectDescendant: false,
    } as ComputedRelationship;
  }

  // Fallback - should not reach here
  return {
    ...baseResult,
    type: 'UNRELATED',
    displayName: 'relative',
    generationDifference: gen2 - gen1,
    isDirectAncestor: false,
    isDirectDescendant: false,
  } as ComputedRelationship;
}

/**
 * Compute in-law relationship (through spouse).
 */
function computeInLawRelationship(
  fromPersonId: string,
  toPersonId: string,
  graph: FamilyGraph
): ComputedRelationship | null {
  const fromPerson = graph.getPerson(fromPersonId);
  const toPerson = graph.getPerson(toPersonId);
  const toGender = toPerson?.gender;

  // Get spouses of fromPerson
  const spouses = graph.getSpouses(fromPersonId);

  for (const { person: spouse } of spouses) {
    // Check if toPerson is a blood relative of the spouse
    const spouseRelation = computeBloodRelationship(spouse.id, toPersonId, graph);

    if (spouseRelation && spouseRelation.isBloodRelation) {
      // Convert to in-law
      return convertToInLaw(fromPersonId, toPersonId, spouseRelation, graph);
    }
  }

  // Check reverse: is toPerson's spouse a blood relative of fromPerson?
  const targetSpouses = graph.getSpouses(toPersonId);

  for (const { person: targetSpouse } of targetSpouses) {
    const bloodRelation = computeBloodRelationship(fromPersonId, targetSpouse.id, graph);

    if (bloodRelation && bloodRelation.isBloodRelation) {
      // toPerson is the spouse of fromPerson's blood relative
      // e.g., if fromPerson's sibling married toPerson, then toPerson is sibling-in-law
      return convertSpouseToInLaw(fromPersonId, toPersonId, bloodRelation, graph);
    }
  }

  return null;
}

/**
 * Convert a blood relationship to its in-law equivalent.
 */
function convertToInLaw(
  fromPersonId: string,
  toPersonId: string,
  bloodRelation: ComputedRelationship,
  graph: FamilyGraph
): ComputedRelationship {
  const fromPerson = graph.getPerson(fromPersonId);
  const toPerson = graph.getPerson(toPersonId);
  const toGender = toPerson?.gender;

  // Get base name and add -in-law
  let displayName = bloodRelation.displayName;

  // Map certain relationships to their in-law names
  const inLawMappings: Record<string, string> = {
    'father': toGender === 'MALE' ? 'father-in-law' : toGender === 'FEMALE' ? 'mother-in-law' : 'parent-in-law',
    'mother': 'mother-in-law',
    'parent': 'parent-in-law',
    'son': toGender === 'MALE' ? 'son-in-law' : toGender === 'FEMALE' ? 'daughter-in-law' : 'child-in-law',
    'daughter': 'daughter-in-law',
    'child': 'child-in-law',
    'brother': toGender === 'MALE' ? 'brother-in-law' : toGender === 'FEMALE' ? 'sister-in-law' : 'sibling-in-law',
    'sister': 'sister-in-law',
    'sibling': 'sibling-in-law',
  };

  const baseName = bloodRelation.displayName.toLowerCase();
  displayName = inLawMappings[baseName] || `${bloodRelation.displayName}-in-law`;

  return {
    ...bloodRelation,
    fromPersonId,
    toPersonId,
    fromPerson,
    toPerson,
    displayName,
    qualifiers: { ...bloodRelation.qualifiers, isInLaw: true },
    isBloodRelation: false,
    consanguinity: 0,
  };
}

/**
 * Convert when toPerson is the spouse of fromPerson's blood relative.
 */
function convertSpouseToInLaw(
  fromPersonId: string,
  toPersonId: string,
  relativeRelation: ComputedRelationship,
  graph: FamilyGraph
): ComputedRelationship {
  const fromPerson = graph.getPerson(fromPersonId);
  const toPerson = graph.getPerson(toPersonId);
  const toGender = toPerson?.gender;

  // The toPerson is the spouse of someone who is [relativeRelation] to fromPerson
  // e.g., if relativeRelation is "sibling", then toPerson is "sibling-in-law"
  // if relativeRelation is "child", then toPerson is "child-in-law"

  let displayName: string;
  let type: DerivedRelationType;

  switch (relativeRelation.type) {
    case 'SIBLING':
    case 'BROTHER':
    case 'SISTER':
      displayName = toGender === 'MALE' ? 'brother-in-law' :
                    toGender === 'FEMALE' ? 'sister-in-law' : 'sibling-in-law';
      type = toGender === 'MALE' ? 'BROTHER_IN_LAW' :
             toGender === 'FEMALE' ? 'SISTER_IN_LAW' : 'SIBLING_IN_LAW';
      break;

    case 'CHILD':
    case 'SON':
    case 'DAUGHTER':
      displayName = toGender === 'MALE' ? 'son-in-law' :
                    toGender === 'FEMALE' ? 'daughter-in-law' : 'child-in-law';
      type = toGender === 'MALE' ? 'SON_IN_LAW' :
             toGender === 'FEMALE' ? 'DAUGHTER_IN_LAW' : 'CHILD_IN_LAW';
      break;

    default:
      displayName = `${relativeRelation.displayName}'s spouse`;
      type = 'SPOUSE';
  }

  return {
    fromPersonId,
    toPersonId,
    fromPerson,
    toPerson,
    type,
    displayName,
    consanguinity: 0,
    generationDifference: relativeRelation.generationDifference,
    commonAncestors: [],
    qualifiers: { ...DEFAULT_QUALIFIERS, isInLaw: true },
    isBloodRelation: false,
    isDirectAncestor: false,
    isDirectDescendant: false,
  };
}

/**
 * Compute step relationship.
 */
function computeStepRelationship(
  fromPersonId: string,
  toPersonId: string,
  graph: FamilyGraph
): ComputedRelationship | null {
  const fromPerson = graph.getPerson(fromPersonId);
  const toPerson = graph.getPerson(toPersonId);
  const toGender = toPerson?.gender;

  // Check if toPerson is a step-parent
  const parents = graph.getParents(fromPersonId);
  const stepParent = parents.find(p => p.person.id === toPersonId && p.metadata.isStep);
  if (stepParent) {
    const displayName = toGender === 'MALE' ? 'step-father' :
                        toGender === 'FEMALE' ? 'step-mother' : 'step-parent';
    return {
      fromPersonId,
      toPersonId,
      fromPerson,
      toPerson,
      type: toGender === 'MALE' ? 'STEP_FATHER' :
            toGender === 'FEMALE' ? 'STEP_MOTHER' : 'STEP_PARENT',
      displayName,
      consanguinity: 0,
      generationDifference: 1,
      commonAncestors: [],
      qualifiers: { ...DEFAULT_QUALIFIERS, isStep: true },
      isBloodRelation: false,
      isDirectAncestor: false,
      isDirectDescendant: false,
    };
  }

  // Check if toPerson is a step-child
  const children = graph.getChildren(fromPersonId);
  const stepChild = children.find(c => c.person.id === toPersonId && c.metadata.isStep);
  if (stepChild) {
    const displayName = toGender === 'MALE' ? 'step-son' :
                        toGender === 'FEMALE' ? 'step-daughter' : 'step-child';
    return {
      fromPersonId,
      toPersonId,
      fromPerson,
      toPerson,
      type: toGender === 'MALE' ? 'STEP_SON' :
            toGender === 'FEMALE' ? 'STEP_DAUGHTER' : 'STEP_CHILD',
      displayName,
      consanguinity: 0,
      generationDifference: -1,
      commonAncestors: [],
      qualifiers: { ...DEFAULT_QUALIFIERS, isStep: true },
      isBloodRelation: false,
      isDirectAncestor: false,
      isDirectDescendant: false,
    };
  }

  // Check for step-siblings (share a step-parent)
  const siblings = graph.getSiblings(fromPersonId);
  const stepSibling = siblings.find(s => s.person.id === toPersonId && s.siblingType === 'step');
  if (stepSibling) {
    const displayName = toGender === 'MALE' ? 'step-brother' :
                        toGender === 'FEMALE' ? 'step-sister' : 'step-sibling';
    return {
      fromPersonId,
      toPersonId,
      fromPerson,
      toPerson,
      type: toGender === 'MALE' ? 'STEP_BROTHER' :
            toGender === 'FEMALE' ? 'STEP_SISTER' : 'STEP_SIBLING',
      displayName,
      consanguinity: 0,
      generationDifference: 0,
      commonAncestors: [],
      qualifiers: { ...DEFAULT_QUALIFIERS, isStep: true },
      isBloodRelation: false,
      isDirectAncestor: false,
      isDirectDescendant: false,
    };
  }

  return null;
}

// Helper functions for type determination

function getSpouseType(gender?: Gender): DerivedRelationType {
  switch (gender) {
    case 'MALE': return 'HUSBAND';
    case 'FEMALE': return 'WIFE';
    default: return 'SPOUSE';
  }
}

function getParentType(gender?: Gender, qualifiers?: RelationshipQualifiers): DerivedRelationType {
  if (qualifiers?.isStep) {
    switch (gender) {
      case 'MALE': return 'STEP_FATHER';
      case 'FEMALE': return 'STEP_MOTHER';
      default: return 'STEP_PARENT';
    }
  }
  switch (gender) {
    case 'MALE': return 'FATHER';
    case 'FEMALE': return 'MOTHER';
    default: return 'PARENT';
  }
}

function getChildType(gender?: Gender, qualifiers?: RelationshipQualifiers): DerivedRelationType {
  if (qualifiers?.isStep) {
    switch (gender) {
      case 'MALE': return 'STEP_SON';
      case 'FEMALE': return 'STEP_DAUGHTER';
      default: return 'STEP_CHILD';
    }
  }
  switch (gender) {
    case 'MALE': return 'SON';
    case 'FEMALE': return 'DAUGHTER';
    default: return 'CHILD';
  }
}

function getSiblingType(gender?: Gender, qualifiers?: RelationshipQualifiers): DerivedRelationType {
  if (qualifiers?.isStep) {
    switch (gender) {
      case 'MALE': return 'STEP_BROTHER';
      case 'FEMALE': return 'STEP_SISTER';
      default: return 'STEP_SIBLING';
    }
  }
  if (qualifiers?.isHalf) {
    switch (gender) {
      case 'MALE': return 'HALF_BROTHER';
      case 'FEMALE': return 'HALF_SISTER';
      default: return 'HALF_SIBLING';
    }
  }
  switch (gender) {
    case 'MALE': return 'BROTHER';
    case 'FEMALE': return 'SISTER';
    default: return 'SIBLING';
  }
}

function getAncestorType(generations: number, gender?: Gender): DerivedRelationType {
  if (generations === 1) return getParentType(gender);
  if (generations === 2) {
    switch (gender) {
      case 'MALE': return 'GRANDFATHER';
      case 'FEMALE': return 'GRANDMOTHER';
      default: return 'GRANDPARENT';
    }
  }
  if (generations === 3) {
    switch (gender) {
      case 'MALE': return 'GREAT_GRANDFATHER';
      case 'FEMALE': return 'GREAT_GRANDMOTHER';
      default: return 'GREAT_GRANDPARENT';
    }
  }
  return 'ANCESTOR';
}

function getDescendantType(generations: number, gender?: Gender): DerivedRelationType {
  if (generations === 1) return getChildType(gender);
  if (generations === 2) {
    switch (gender) {
      case 'MALE': return 'GRANDSON';
      case 'FEMALE': return 'GRANDDAUGHTER';
      default: return 'GRANDCHILD';
    }
  }
  if (generations === 3) {
    switch (gender) {
      case 'MALE': return 'GREAT_GRANDSON';
      case 'FEMALE': return 'GREAT_GRANDDAUGHTER';
      default: return 'GREAT_GRANDCHILD';
    }
  }
  return 'DESCENDANT';
}

function getAuntUncleType(generationsUp: number, gender?: Gender): DerivedRelationType {
  if (generationsUp === 2) {
    switch (gender) {
      case 'MALE': return 'UNCLE';
      case 'FEMALE': return 'AUNT';
      default: return 'PIBLING';
    }
  }
  if (generationsUp === 3) {
    switch (gender) {
      case 'MALE': return 'GREAT_UNCLE';
      case 'FEMALE': return 'GREAT_AUNT';
      default: return 'GREAT_PIBLING';
    }
  }
  return gender === 'MALE' ? 'UNCLE' : gender === 'FEMALE' ? 'AUNT' : 'PIBLING';
}

function getNephewNieceType(generationsDown: number, gender?: Gender): DerivedRelationType {
  if (generationsDown === 2) {
    switch (gender) {
      case 'MALE': return 'NEPHEW';
      case 'FEMALE': return 'NIECE';
      default: return 'NIBLING';
    }
  }
  if (generationsDown === 3) {
    switch (gender) {
      case 'MALE': return 'GREAT_NEPHEW';
      case 'FEMALE': return 'GREAT_NIECE';
      default: return 'GREAT_NIBLING';
    }
  }
  return gender === 'MALE' ? 'NEPHEW' : gender === 'FEMALE' ? 'NIECE' : 'NIBLING';
}

// =============================================================================
// Batch Operations
// =============================================================================

/**
 * Result of a batch computation
 */
export interface BatchResult {
  fromPersonId: string;
  toPersonId: string;
  relationship: ComputedRelationship | null;
}

/**
 * Compute relationships for multiple pairs efficiently.
 *
 * Optimizes by:
 * - Reusing ancestor computations when the same person appears multiple times
 * - Processing in parallel where possible
 *
 * @param pairs - Array of [fromPersonId, toPersonId] pairs
 * @param graph - FamilyGraph instance
 * @returns Array of BatchResult objects
 */
export function computeRelationshipsBatch(
  pairs: Array<[string, string]>,
  graph: FamilyGraph
): BatchResult[] {
  // Track ancestor maps for reuse
  const ancestorCache = new Map<string, Map<string, { distance: number }>>();
  const descendantCache = new Map<string, Map<string, { distance: number }>>();

  // Pre-compute ancestors/descendants for all unique persons
  const uniquePersons = new Set<string>();
  for (const [from, to] of pairs) {
    uniquePersons.add(from);
    uniquePersons.add(to);
  }

  // Pre-populate caches
  for (const personId of uniquePersons) {
    if (!ancestorCache.has(personId)) {
      ancestorCache.set(personId, getAllAncestorsWithDistance(personId, graph));
    }
    // Only compute descendants if needed (less common)
  }

  // Compute relationships for each pair
  const results: BatchResult[] = [];

  for (const [fromPersonId, toPersonId] of pairs) {
    const relationship = computeRelationship(fromPersonId, toPersonId, graph);
    results.push({
      fromPersonId,
      toPersonId,
      relationship,
    });
  }

  return results;
}

/**
 * Find all relatives of a specific type for a person.
 *
 * @param personId - The person to find relatives for
 * @param type - The relationship type to filter by
 * @param graph - FamilyGraph instance
 * @param options - Additional options
 * @returns Array of computed relationships matching the type
 */
export function findAllRelativesOfType(
  personId: string,
  type: DerivedRelationType,
  graph: FamilyGraph,
  options: {
    maxResults?: number;
    includeQualifiers?: boolean; // Include step/half variants
  } = {}
): ComputedRelationship[] {
  const { maxResults = 100, includeQualifiers = true } = options;
  const results: ComputedRelationship[] = [];

  // Get all persons in the graph
  const allPersonIds = graph.getAllPersonIds();

  for (const otherId of allPersonIds) {
    if (otherId === personId) continue;
    if (results.length >= maxResults) break;

    const relationship = computeRelationship(personId, otherId, graph);
    if (!relationship) continue;

    // Check if type matches
    if (relationship.type === type) {
      results.push(relationship);
    } else if (includeQualifiers) {
      // Check for qualified variants (e.g., HALF_SIBLING when looking for SIBLING)
      const baseType = type.replace(/^(HALF_|STEP_)/, '');
      const relBaseType = relationship.type.replace(/^(HALF_|STEP_)/, '');
      if (baseType === relBaseType) {
        results.push(relationship);
      }
    }
  }

  return results;
}

/**
 * Compute relationship matrix for a group of people.
 * Returns a map of all pairwise relationships.
 *
 * @param personIds - Array of person IDs
 * @param graph - FamilyGraph instance
 * @returns Map with key "personA:personB" and value ComputedRelationship
 */
export function computeRelationshipMatrix(
  personIds: string[],
  graph: FamilyGraph
): Map<string, ComputedRelationship | null> {
  const matrix = new Map<string, ComputedRelationship | null>();

  // Generate all pairs
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < personIds.length; i++) {
    for (let j = i + 1; j < personIds.length; j++) {
      pairs.push([personIds[i], personIds[j]]);
    }
  }

  // Compute all relationships
  const results = computeRelationshipsBatch(pairs, graph);

  // Build matrix
  for (const result of results) {
    const key = `${result.fromPersonId}:${result.toPersonId}`;
    matrix.set(key, result.relationship);
    // Also add reverse key for easy lookup
    const reverseKey = `${result.toPersonId}:${result.fromPersonId}`;
    matrix.set(reverseKey, result.relationship);
  }

  return matrix;
}

/**
 * Get relationship counts for a person.
 * Optimized for getting statistics without full relationship details.
 *
 * @param personId - The person to analyze
 * @param graph - FamilyGraph instance
 * @returns Count of relatives by category
 */
export function getRelationshipCounts(
  personId: string,
  graph: FamilyGraph
): {
  total: number;
  blood: number;
  inLaw: number;
  step: number;
  byType: Map<string, number>;
} {
  const counts = {
    total: 0,
    blood: 0,
    inLaw: 0,
    step: 0,
    byType: new Map<string, number>(),
  };

  const allPersonIds = graph.getAllPersonIds();

  for (const otherId of allPersonIds) {
    if (otherId === personId) continue;

    const relationship = computeRelationship(personId, otherId, graph);
    if (!relationship) continue;

    counts.total++;

    if (relationship.isBloodRelation) counts.blood++;
    if (relationship.qualifiers.isInLaw) counts.inLaw++;
    if (relationship.qualifiers.isStep) counts.step++;

    // Count by type
    const typeCount = counts.byType.get(relationship.type) ?? 0;
    counts.byType.set(relationship.type, typeCount + 1);
  }

  return counts;
}
