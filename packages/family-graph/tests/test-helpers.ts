/**
 * Test Helpers - Utilities for building test family trees
 */

import type { PersonNode, StoredRelationship, FoundationalRelationType, Gender } from '../src/types.js';
import { FamilyGraph } from '../src/graph.js';

/**
 * Create a test person with minimal data
 */
export function createPerson(
  id: string,
  firstName: string,
  lastName: string,
  gender: Gender = 'UNKNOWN'
): PersonNode {
  return {
    id,
    firstName,
    lastName,
    gender,
  };
}

/**
 * Create a relationship
 */
export function createRelationship(
  id: string,
  personFromId: string,
  personToId: string,
  relationshipType: FoundationalRelationType
): StoredRelationship {
  return {
    id,
    personFromId,
    personToId,
    relationshipType,
  };
}

/**
 * Build a simple nuclear family:
 * - Father + Mother (spouses)
 * - Child1, Child2 (children)
 */
export function buildNuclearFamily(): {
  graph: FamilyGraph;
  persons: Map<string, PersonNode>;
} {
  const persons = new Map<string, PersonNode>();

  const father = createPerson('father', 'John', 'Smith', 'MALE');
  const mother = createPerson('mother', 'Jane', 'Smith', 'FEMALE');
  const child1 = createPerson('child1', 'Alice', 'Smith', 'FEMALE');
  const child2 = createPerson('child2', 'Bob', 'Smith', 'MALE');

  persons.set('father', father);
  persons.set('mother', mother);
  persons.set('child1', child1);
  persons.set('child2', child2);

  const relationships: StoredRelationship[] = [
    createRelationship('r1', 'father', 'mother', 'SPOUSE'),
    createRelationship('r2', 'father', 'child1', 'PARENT'),
    createRelationship('r3', 'father', 'child2', 'PARENT'),
    createRelationship('r4', 'mother', 'child1', 'PARENT'),
    createRelationship('r5', 'mother', 'child2', 'PARENT'),
  ];

  const graph = FamilyGraph.fromData(Array.from(persons.values()), relationships);

  return { graph, persons };
}

/**
 * Build a three-generation family:
 * - Grandparents (paternal and maternal)
 * - Parents
 * - Children
 */
export function buildThreeGenerationFamily(): {
  graph: FamilyGraph;
  persons: Map<string, PersonNode>;
} {
  const persons = new Map<string, PersonNode>();

  // Grandparents
  const gfP = createPerson('grandpa-p', 'George', 'Smith', 'MALE');
  const gmP = createPerson('grandma-p', 'Mary', 'Smith', 'FEMALE');
  const gfM = createPerson('grandpa-m', 'William', 'Jones', 'MALE');
  const gmM = createPerson('grandma-m', 'Elizabeth', 'Jones', 'FEMALE');

  // Parents
  const father = createPerson('father', 'John', 'Smith', 'MALE');
  const mother = createPerson('mother', 'Jane', 'Smith', 'FEMALE');

  // Children
  const child1 = createPerson('child1', 'Alice', 'Smith', 'FEMALE');
  const child2 = createPerson('child2', 'Bob', 'Smith', 'MALE');

  persons.set('grandpa-p', gfP);
  persons.set('grandma-p', gmP);
  persons.set('grandpa-m', gfM);
  persons.set('grandma-m', gmM);
  persons.set('father', father);
  persons.set('mother', mother);
  persons.set('child1', child1);
  persons.set('child2', child2);

  const relationships: StoredRelationship[] = [
    // Paternal grandparents
    createRelationship('r1', 'grandpa-p', 'grandma-p', 'SPOUSE'),
    createRelationship('r2', 'grandpa-p', 'father', 'PARENT'),
    createRelationship('r3', 'grandma-p', 'father', 'PARENT'),
    // Maternal grandparents
    createRelationship('r4', 'grandpa-m', 'grandma-m', 'SPOUSE'),
    createRelationship('r5', 'grandpa-m', 'mother', 'PARENT'),
    createRelationship('r6', 'grandma-m', 'mother', 'PARENT'),
    // Parents
    createRelationship('r7', 'father', 'mother', 'SPOUSE'),
    createRelationship('r8', 'father', 'child1', 'PARENT'),
    createRelationship('r9', 'father', 'child2', 'PARENT'),
    createRelationship('r10', 'mother', 'child1', 'PARENT'),
    createRelationship('r11', 'mother', 'child2', 'PARENT'),
  ];

  const graph = FamilyGraph.fromData(Array.from(persons.values()), relationships);

  return { graph, persons };
}

/**
 * Build a family with cousins:
 *
 *        Grandpa ─── Grandma
 *            │           │
 *     ┌──────┴───────────┴──────┐
 *     │                         │
 *   Father ─ Mother         Uncle ─ Aunt
 *     │                         │
 *   Child                    Cousin
 */
export function buildCousinFamily(): {
  graph: FamilyGraph;
  persons: Map<string, PersonNode>;
} {
  const persons = new Map<string, PersonNode>();

  // Grandparents
  const grandpa = createPerson('grandpa', 'George', 'Smith', 'MALE');
  const grandma = createPerson('grandma', 'Mary', 'Smith', 'FEMALE');

  // Generation 2 - Two siblings with spouses
  const father = createPerson('father', 'John', 'Smith', 'MALE');
  const mother = createPerson('mother', 'Jane', 'Smith', 'FEMALE');
  const uncle = createPerson('uncle', 'James', 'Smith', 'MALE');
  const aunt = createPerson('aunt', 'Sarah', 'Smith', 'FEMALE');

  // Generation 3 - Cousins
  const child = createPerson('child', 'Alice', 'Smith', 'FEMALE');
  const cousin = createPerson('cousin', 'Charlie', 'Smith', 'MALE');

  persons.set('grandpa', grandpa);
  persons.set('grandma', grandma);
  persons.set('father', father);
  persons.set('mother', mother);
  persons.set('uncle', uncle);
  persons.set('aunt', aunt);
  persons.set('child', child);
  persons.set('cousin', cousin);

  const relationships: StoredRelationship[] = [
    // Grandparents
    createRelationship('r1', 'grandpa', 'grandma', 'SPOUSE'),
    // Father is child of grandparents
    createRelationship('r2', 'grandpa', 'father', 'PARENT'),
    createRelationship('r3', 'grandma', 'father', 'PARENT'),
    // Uncle is child of grandparents
    createRelationship('r4', 'grandpa', 'uncle', 'PARENT'),
    createRelationship('r5', 'grandma', 'uncle', 'PARENT'),
    // Father + Mother
    createRelationship('r6', 'father', 'mother', 'SPOUSE'),
    createRelationship('r7', 'father', 'child', 'PARENT'),
    createRelationship('r8', 'mother', 'child', 'PARENT'),
    // Uncle + Aunt
    createRelationship('r9', 'uncle', 'aunt', 'SPOUSE'),
    createRelationship('r10', 'uncle', 'cousin', 'PARENT'),
    createRelationship('r11', 'aunt', 'cousin', 'PARENT'),
  ];

  const graph = FamilyGraph.fromData(Array.from(persons.values()), relationships);

  return { graph, persons };
}

/**
 * Build a family with second cousins:
 *
 *               GreatGrandpa ─── GreatGrandma
 *                     │               │
 *          ┌─────────┴───────────────┴──────────┐
 *          │                                    │
 *       Grandpa ─── Grandma             GreatUncle ─── GreatAunt
 *          │                                    │
 *       Father ─── Mother                    Cousin1P ─── Cousin1Spouse
 *          │                                    │
 *        Child                              SecondCousin
 */
export function buildSecondCousinFamily(): {
  graph: FamilyGraph;
  persons: Map<string, PersonNode>;
} {
  const persons = new Map<string, PersonNode>();

  // Great-grandparents
  const ggp = createPerson('ggp', 'Abraham', 'Smith', 'MALE');
  const ggm = createPerson('ggm', 'Sarah', 'Smith', 'FEMALE');

  // Grandparents + Great-uncle
  const grandpa = createPerson('grandpa', 'George', 'Smith', 'MALE');
  const grandma = createPerson('grandma', 'Mary', 'Smith', 'FEMALE');
  const greatuncle = createPerson('greatuncle', 'Henry', 'Smith', 'MALE');
  const greataunt = createPerson('greataunt', 'Helen', 'Smith', 'FEMALE');

  // Parents + First cousin once removed parent
  const father = createPerson('father', 'John', 'Smith', 'MALE');
  const mother = createPerson('mother', 'Jane', 'Smith', 'FEMALE');
  const cousin1p = createPerson('cousin1p', 'Thomas', 'Smith', 'MALE');
  const cousin1s = createPerson('cousin1s', 'Emma', 'Smith', 'FEMALE');

  // Children
  const child = createPerson('child', 'Alice', 'Smith', 'FEMALE');
  const secondcousin = createPerson('secondcousin', 'David', 'Smith', 'MALE');

  for (const [id, p] of [
    ['ggp', ggp], ['ggm', ggm], ['grandpa', grandpa], ['grandma', grandma],
    ['greatuncle', greatuncle], ['greataunt', greataunt],
    ['father', father], ['mother', mother], ['cousin1p', cousin1p], ['cousin1s', cousin1s],
    ['child', child], ['secondcousin', secondcousin]
  ] as [string, PersonNode][]) {
    persons.set(id, p);
  }

  const relationships: StoredRelationship[] = [
    // Great-grandparents
    createRelationship('r1', 'ggp', 'ggm', 'SPOUSE'),
    createRelationship('r2', 'ggp', 'grandpa', 'PARENT'),
    createRelationship('r3', 'ggm', 'grandpa', 'PARENT'),
    createRelationship('r4', 'ggp', 'greatuncle', 'PARENT'),
    createRelationship('r5', 'ggm', 'greatuncle', 'PARENT'),
    // Grandparents
    createRelationship('r6', 'grandpa', 'grandma', 'SPOUSE'),
    createRelationship('r7', 'grandpa', 'father', 'PARENT'),
    createRelationship('r8', 'grandma', 'father', 'PARENT'),
    // Great-uncle + aunt
    createRelationship('r9', 'greatuncle', 'greataunt', 'SPOUSE'),
    createRelationship('r10', 'greatuncle', 'cousin1p', 'PARENT'),
    createRelationship('r11', 'greataunt', 'cousin1p', 'PARENT'),
    // Parents
    createRelationship('r12', 'father', 'mother', 'SPOUSE'),
    createRelationship('r13', 'father', 'child', 'PARENT'),
    createRelationship('r14', 'mother', 'child', 'PARENT'),
    // First cousin once removed + spouse
    createRelationship('r15', 'cousin1p', 'cousin1s', 'SPOUSE'),
    createRelationship('r16', 'cousin1p', 'secondcousin', 'PARENT'),
    createRelationship('r17', 'cousin1s', 'secondcousin', 'PARENT'),
  ];

  const graph = FamilyGraph.fromData(Array.from(persons.values()), relationships);

  return { graph, persons };
}

/**
 * Build a family with half-siblings:
 *
 *   Father1 ─── Mother ─── Father2
 *       │          │           │
 *     Child1     Child2     Child3
 *
 * Child1 and Child2 share Mother (half-siblings)
 * Child2 and Child3 share Mother (half-siblings)
 * Child1 and Child3 are not related
 */
export function buildHalfSiblingFamily(): {
  graph: FamilyGraph;
  persons: Map<string, PersonNode>;
} {
  const persons = new Map<string, PersonNode>();

  const father1 = createPerson('father1', 'John', 'Smith', 'MALE');
  const mother = createPerson('mother', 'Jane', 'Jones', 'FEMALE');
  const father2 = createPerson('father2', 'Bob', 'Williams', 'MALE');
  const child1 = createPerson('child1', 'Alice', 'Smith', 'FEMALE');
  const child2 = createPerson('child2', 'Carol', 'Jones', 'FEMALE');
  const child3 = createPerson('child3', 'David', 'Williams', 'MALE');

  persons.set('father1', father1);
  persons.set('mother', mother);
  persons.set('father2', father2);
  persons.set('child1', child1);
  persons.set('child2', child2);
  persons.set('child3', child3);

  const relationships: StoredRelationship[] = [
    // Child1 from father1 and mother
    createRelationship('r1', 'father1', 'child1', 'PARENT'),
    createRelationship('r2', 'mother', 'child1', 'PARENT'),
    // Child2 from mother only (different father)
    createRelationship('r3', 'mother', 'child2', 'PARENT'),
    // Child3 from mother and father2
    createRelationship('r4', 'mother', 'child3', 'PARENT'),
    createRelationship('r5', 'father2', 'child3', 'PARENT'),
  ];

  const graph = FamilyGraph.fromData(Array.from(persons.values()), relationships);

  return { graph, persons };
}

/**
 * Build a family with step relationships:
 *
 *   Father ─── StepMother (STEP_PARENT)
 *       │          │
 *     Child     StepChild (StepMother's child)
 */
export function buildStepFamily(): {
  graph: FamilyGraph;
  persons: Map<string, PersonNode>;
} {
  const persons = new Map<string, PersonNode>();

  const father = createPerson('father', 'John', 'Smith', 'MALE');
  const stepmother = createPerson('stepmother', 'Susan', 'Brown', 'FEMALE');
  const child = createPerson('child', 'Alice', 'Smith', 'FEMALE');
  const stepchild = createPerson('stepchild', 'Brian', 'Brown', 'MALE');

  persons.set('father', father);
  persons.set('stepmother', stepmother);
  persons.set('child', child);
  persons.set('stepchild', stepchild);

  const relationships: StoredRelationship[] = [
    // Father married to StepMother
    createRelationship('r1', 'father', 'stepmother', 'SPOUSE'),
    // Father is parent of child
    createRelationship('r2', 'father', 'child', 'PARENT'),
    // StepMother is step-parent of child
    createRelationship('r3', 'stepmother', 'child', 'STEP_PARENT'),
    // Father is step-parent of stepchild
    createRelationship('r4', 'father', 'stepchild', 'STEP_PARENT'),
    // StepMother is parent of stepchild
    createRelationship('r5', 'stepmother', 'stepchild', 'PARENT'),
  ];

  const graph = FamilyGraph.fromData(Array.from(persons.values()), relationships);

  return { graph, persons };
}

/**
 * Build a family with in-laws:
 *
 *   FatherInLaw ─── MotherInLaw
 *          │
 *       Spouse ─── Person
 */
export function buildInLawFamily(): {
  graph: FamilyGraph;
  persons: Map<string, PersonNode>;
} {
  const persons = new Map<string, PersonNode>();

  const fatherInLaw = createPerson('father-in-law', 'Robert', 'Jones', 'MALE');
  const motherInLaw = createPerson('mother-in-law', 'Linda', 'Jones', 'FEMALE');
  const spouse = createPerson('spouse', 'Michael', 'Jones', 'MALE');
  const person = createPerson('person', 'Emily', 'Smith', 'FEMALE');
  const siblingInLaw = createPerson('sibling-in-law', 'Sarah', 'Jones', 'FEMALE');

  persons.set('father-in-law', fatherInLaw);
  persons.set('mother-in-law', motherInLaw);
  persons.set('spouse', spouse);
  persons.set('person', person);
  persons.set('sibling-in-law', siblingInLaw);

  const relationships: StoredRelationship[] = [
    // In-laws are parents of spouse
    createRelationship('r1', 'father-in-law', 'mother-in-law', 'SPOUSE'),
    createRelationship('r2', 'father-in-law', 'spouse', 'PARENT'),
    createRelationship('r3', 'mother-in-law', 'spouse', 'PARENT'),
    createRelationship('r4', 'father-in-law', 'sibling-in-law', 'PARENT'),
    createRelationship('r5', 'mother-in-law', 'sibling-in-law', 'PARENT'),
    // Person married to spouse
    createRelationship('r6', 'person', 'spouse', 'SPOUSE'),
  ];

  const graph = FamilyGraph.fromData(Array.from(persons.values()), relationships);

  return { graph, persons };
}

/**
 * Build an empty graph
 */
export function buildEmptyGraph(): FamilyGraph {
  return FamilyGraph.fromData([], []);
}

/**
 * Build a single person graph
 */
export function buildSinglePersonGraph(): {
  graph: FamilyGraph;
  person: PersonNode;
} {
  const person = createPerson('person1', 'John', 'Doe', 'MALE');
  const graph = FamilyGraph.fromData([person], []);
  return { graph, person };
}

/**
 * Build a disconnected graph (two separate families with no connection)
 */
export function buildDisconnectedGraph(): {
  graph: FamilyGraph;
  persons: Map<string, PersonNode>;
} {
  const persons = new Map<string, PersonNode>();

  // Family 1
  const father1 = createPerson('father1', 'John', 'Smith', 'MALE');
  const mother1 = createPerson('mother1', 'Jane', 'Smith', 'FEMALE');
  const child1 = createPerson('child1', 'Alice', 'Smith', 'FEMALE');

  // Family 2 (completely separate)
  const father2 = createPerson('father2', 'Bob', 'Jones', 'MALE');
  const mother2 = createPerson('mother2', 'Mary', 'Jones', 'FEMALE');
  const child2 = createPerson('child2', 'Charlie', 'Jones', 'MALE');

  persons.set('father1', father1);
  persons.set('mother1', mother1);
  persons.set('child1', child1);
  persons.set('father2', father2);
  persons.set('mother2', mother2);
  persons.set('child2', child2);

  const relationships: StoredRelationship[] = [
    // Family 1
    createRelationship('r1', 'father1', 'mother1', 'SPOUSE'),
    createRelationship('r2', 'father1', 'child1', 'PARENT'),
    createRelationship('r3', 'mother1', 'child1', 'PARENT'),
    // Family 2
    createRelationship('r4', 'father2', 'mother2', 'SPOUSE'),
    createRelationship('r5', 'father2', 'child2', 'PARENT'),
    createRelationship('r6', 'mother2', 'child2', 'PARENT'),
  ];

  const graph = FamilyGraph.fromData(Array.from(persons.values()), relationships);

  return { graph, persons };
}

/**
 * Build a large family tree for performance testing
 * Creates a tree with multiple generations
 */
export function buildLargeFamily(
  generations: number = 5,
  childrenPerCouple: number = 3
): {
  graph: FamilyGraph;
  persons: Map<string, PersonNode>;
  rootCoupleIds: [string, string];
} {
  const persons = new Map<string, PersonNode>();
  const relationships: StoredRelationship[] = [];
  let personCounter = 0;
  let relCounter = 0;

  function nextPersonId(): string {
    return `p${++personCounter}`;
  }

  function nextRelId(): string {
    return `r${++relCounter}`;
  }

  function createCouple(gen: number, suffix: string): [string, string] {
    const husbandId = nextPersonId();
    const wifeId = nextPersonId();

    persons.set(husbandId, createPerson(husbandId, `Husband_${gen}_${suffix}`, 'Family', 'MALE'));
    persons.set(wifeId, createPerson(wifeId, `Wife_${gen}_${suffix}`, 'Family', 'FEMALE'));

    relationships.push(createRelationship(nextRelId(), husbandId, wifeId, 'SPOUSE'));

    return [husbandId, wifeId];
  }

  function createChildren(
    fatherId: string,
    motherId: string,
    gen: number,
    count: number
  ): string[] {
    const childIds: string[] = [];

    for (let i = 0; i < count; i++) {
      const childId = nextPersonId();
      const gender: Gender = i % 2 === 0 ? 'MALE' : 'FEMALE';

      persons.set(childId, createPerson(childId, `Child_${gen}_${i}`, 'Family', gender));

      relationships.push(createRelationship(nextRelId(), fatherId, childId, 'PARENT'));
      relationships.push(createRelationship(nextRelId(), motherId, childId, 'PARENT'));

      childIds.push(childId);
    }

    return childIds;
  }

  // Start with root couple
  const rootCouple = createCouple(0, 'root');

  // Generate tree recursively
  function generateLevel(couples: [string, string][], currentGen: number): void {
    if (currentGen >= generations) return;

    const nextCouples: [string, string][] = [];

    for (const [fatherId, motherId] of couples) {
      const children = createChildren(fatherId, motherId, currentGen + 1, childrenPerCouple);

      // Create spouses for children and make new couples
      for (let i = 0; i < children.length; i++) {
        const childId = children[i];
        const spouseId = nextPersonId();
        const childGender = persons.get(childId)!.gender;
        const spouseGender: Gender = childGender === 'MALE' ? 'FEMALE' : 'MALE';

        persons.set(spouseId, createPerson(spouseId, `Spouse_${currentGen + 1}_${i}`, 'Married', spouseGender));
        relationships.push(createRelationship(nextRelId(), childId, spouseId, 'SPOUSE'));

        if (childGender === 'MALE') {
          nextCouples.push([childId, spouseId]);
        } else {
          nextCouples.push([spouseId, childId]);
        }
      }
    }

    generateLevel(nextCouples, currentGen + 1);
  }

  generateLevel([rootCouple], 0);

  const graph = FamilyGraph.fromData(Array.from(persons.values()), relationships);

  return { graph, persons, rootCoupleIds: rootCouple };
}
