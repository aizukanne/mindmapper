/**
 * Common Ancestor Algorithm
 *
 * The key to computing genealogical relationships is finding the
 * Most Recent Common Ancestor (MRCA) between two people.
 *
 * Once we know:
 * - Distance from Person A to MRCA (gen1)
 * - Distance from Person B to MRCA (gen2)
 *
 * We can determine any blood relationship using the classification matrix.
 */

import type { FamilyGraph } from './graph.js';
import type { CommonAncestor, PersonNode } from './types.js';
import { getAllAncestorsWithDistance, type TraversalResult } from './traversal.js';

/**
 * Find all common ancestors between two people.
 *
 * Algorithm:
 * 1. Get all ancestors of Person A with their distances
 * 2. Get all ancestors of Person B with their distances
 * 3. Find the intersection (common ancestors)
 * 4. Sort by total distance (MRCA has shortest total distance)
 *
 * @param personAId - First person
 * @param personBId - Second person
 * @param graph - FamilyGraph instance
 * @returns Array of common ancestors sorted by total distance (MRCA first)
 */
export function findCommonAncestors(
  personAId: string,
  personBId: string,
  graph: FamilyGraph
): CommonAncestor[] {
  // Handle same person case
  if (personAId === personBId) {
    const person = graph.getPerson(personAId);
    return [{
      ancestorId: personAId,
      ancestor: person,
      distanceFromA: 0,
      distanceFromB: 0,
      totalDistance: 0,
    }];
  }

  // Get all ancestors of both people
  const ancestorsA = getAllAncestorsWithDistance(personAId, graph);
  const ancestorsB = getAllAncestorsWithDistance(personBId, graph);

  // Also include the persons themselves (distance 0)
  // This handles the case where one person IS an ancestor of the other
  ancestorsA.set(personAId, {
    personId: personAId,
    person: graph.getPerson(personAId),
    distance: 0,
    path: [personAId],
    pathMetadata: [],
  });
  ancestorsB.set(personBId, {
    personId: personBId,
    person: graph.getPerson(personBId),
    distance: 0,
    path: [personBId],
    pathMetadata: [],
  });

  // Find common ancestors
  const commonAncestors: CommonAncestor[] = [];

  for (const [ancestorId, resultA] of ancestorsA) {
    const resultB = ancestorsB.get(ancestorId);
    if (resultB) {
      commonAncestors.push({
        ancestorId,
        ancestor: resultA.person,
        distanceFromA: resultA.distance,
        distanceFromB: resultB.distance,
        totalDistance: resultA.distance + resultB.distance,
      });
    }
  }

  // Sort by total distance (MRCA first)
  // If tied, prefer the one with more balanced distances
  return commonAncestors.sort((a, b) => {
    if (a.totalDistance !== b.totalDistance) {
      return a.totalDistance - b.totalDistance;
    }
    // Prefer more balanced (smaller difference between distances)
    const balanceA = Math.abs(a.distanceFromA - a.distanceFromB);
    const balanceB = Math.abs(b.distanceFromA - b.distanceFromB);
    return balanceA - balanceB;
  });
}

/**
 * Get the Most Recent Common Ancestor (MRCA) between two people.
 * This is the common ancestor with the shortest total path distance.
 *
 * @param personAId - First person
 * @param personBId - Second person
 * @param graph - FamilyGraph instance
 * @returns MRCA or null if no common ancestor exists
 */
export function getMRCA(
  personAId: string,
  personBId: string,
  graph: FamilyGraph
): CommonAncestor | null {
  const commonAncestors = findCommonAncestors(personAId, personBId, graph);
  return commonAncestors.length > 0 ? commonAncestors[0] : null;
}

/**
 * Find all "closest" common ancestors.
 * There may be multiple ancestors at the same minimum distance
 * (e.g., both grandparents of first cousins).
 *
 * @param personAId - First person
 * @param personBId - Second person
 * @param graph - FamilyGraph instance
 * @returns Array of MRCAs (may be empty, one, or multiple)
 */
export function getAllMRCAs(
  personAId: string,
  personBId: string,
  graph: FamilyGraph
): CommonAncestor[] {
  const commonAncestors = findCommonAncestors(personAId, personBId, graph);

  if (commonAncestors.length === 0) return [];

  const minDistance = commonAncestors[0].totalDistance;
  return commonAncestors.filter(ca => ca.totalDistance === minDistance);
}

/**
 * Check if two people share any common ancestor.
 * This is a quick check without computing full ancestor sets if not needed.
 *
 * @param personAId - First person
 * @param personBId - Second person
 * @param graph - FamilyGraph instance
 * @param maxGenerations - Maximum generations to search (default: unlimited)
 * @returns true if they share at least one common ancestor
 */
export function haveCommonAncestor(
  personAId: string,
  personBId: string,
  graph: FamilyGraph,
  maxGenerations: number = Infinity
): boolean {
  if (personAId === personBId) return true;

  // Bidirectional BFS for efficiency on large trees
  const ancestorsA = new Set<string>([personAId]);
  const ancestorsB = new Set<string>([personBId]);

  let frontierA = [personAId];
  let frontierB = [personBId];

  for (let gen = 0; gen < maxGenerations; gen++) {
    // Expand frontier A
    const newFrontierA: string[] = [];
    for (const personId of frontierA) {
      const parentIds = graph.getParentIds(personId);
      for (const parentId of parentIds) {
        if (ancestorsB.has(parentId)) {
          return true; // Found common ancestor
        }
        if (!ancestorsA.has(parentId)) {
          ancestorsA.add(parentId);
          newFrontierA.push(parentId);
        }
      }
    }
    frontierA = newFrontierA;

    // Expand frontier B
    const newFrontierB: string[] = [];
    for (const personId of frontierB) {
      const parentIds = graph.getParentIds(personId);
      for (const parentId of parentIds) {
        if (ancestorsA.has(parentId)) {
          return true; // Found common ancestor
        }
        if (!ancestorsB.has(parentId)) {
          ancestorsB.add(parentId);
          newFrontierB.push(parentId);
        }
      }
    }
    frontierB = newFrontierB;

    // If both frontiers are empty, no common ancestor exists
    if (frontierA.length === 0 && frontierB.length === 0) {
      return false;
    }
  }

  return false;
}

/**
 * Calculate the coefficient of relationship (consanguinity).
 *
 * The coefficient represents the probability that two individuals
 * share an allele inherited from a common ancestor.
 *
 * Formula: r = sum over all common ancestors of (1/2)^(n1 + n2)
 * where n1 and n2 are the generations to each common ancestor.
 *
 * Common values:
 * - Parent/Child: 0.5 (50%)
 * - Full siblings: 0.5 (50%)
 * - Grandparent/Grandchild: 0.25 (25%)
 * - Half siblings: 0.25 (25%)
 * - First cousins: 0.125 (12.5%)
 * - Second cousins: 0.03125 (3.125%)
 *
 * @param personAId - First person
 * @param personBId - Second person
 * @param graph - FamilyGraph instance
 * @returns Coefficient of relationship (0 to 1)
 */
export function calculateConsanguinity(
  personAId: string,
  personBId: string,
  graph: FamilyGraph
): number {
  if (personAId === personBId) return 1.0;

  const commonAncestors = findCommonAncestors(personAId, personBId, graph);

  if (commonAncestors.length === 0) return 0;

  // Sum over all common ancestors
  // Note: This is a simplified calculation that doesn't account for
  // inbreeding loops. For a more accurate calculation in complex trees,
  // you would need path counting through each ancestor.
  let coefficient = 0;

  // We use the MRCA for simplicity
  // A more complete implementation would trace all paths
  const mrca = commonAncestors[0];

  // r = (1/2)^(n1 + n2) for the primary path
  coefficient = Math.pow(0.5, mrca.distanceFromA + mrca.distanceFromB);

  return coefficient;
}

/**
 * Get the canonical degree of consanguinity (Canon law / Catholic Church method).
 * This is the maximum of the two distances to the MRCA.
 *
 * Common values:
 * - Siblings: 1st degree
 * - First cousins: 2nd degree
 * - Second cousins: 3rd degree
 *
 * @param personAId - First person
 * @param personBId - Second person
 * @param graph - FamilyGraph instance
 * @returns Degree of consanguinity (0 if unrelated)
 */
export function getCanonicalDegree(
  personAId: string,
  personBId: string,
  graph: FamilyGraph
): number {
  if (personAId === personBId) return 0;

  const mrca = getMRCA(personAId, personBId, graph);
  if (!mrca) return 0;

  // Canon law uses the maximum distance
  return Math.max(mrca.distanceFromA, mrca.distanceFromB);
}

/**
 * Get the civil degree of consanguinity (Civil law method).
 * This is the sum of the two distances to the MRCA.
 *
 * Common values:
 * - Parent/Child: 1st degree
 * - Siblings: 2nd degree
 * - Grandparent: 2nd degree
 * - First cousins: 4th degree
 *
 * @param personAId - First person
 * @param personBId - Second person
 * @param graph - FamilyGraph instance
 * @returns Civil degree of consanguinity (0 if unrelated)
 */
export function getCivilDegree(
  personAId: string,
  personBId: string,
  graph: FamilyGraph
): number {
  if (personAId === personBId) return 0;

  const mrca = getMRCA(personAId, personBId, graph);
  if (!mrca) return 0;

  // Civil law uses the sum of distances
  return mrca.distanceFromA + mrca.distanceFromB;
}

/**
 * Find all people who are related to a given person through a specific ancestor.
 * Useful for finding all descendants of a particular ancestor who are related.
 *
 * @param personId - Starting person
 * @param ancestorId - Common ancestor to trace through
 * @param graph - FamilyGraph instance
 * @returns Array of person IDs who share this ancestor
 */
export function getRelativesThroughAncestor(
  personId: string,
  ancestorId: string,
  graph: FamilyGraph
): string[] {
  // Verify the ancestor is actually an ancestor
  const ancestors = getAllAncestorsWithDistance(personId, graph);
  if (!ancestors.has(ancestorId) && ancestorId !== personId) {
    return [];
  }

  // Get all descendants of the ancestor
  const allDescendants = new Set<string>();

  function collectDescendants(currentId: string): void {
    const children = graph.getChildIds(currentId);
    for (const childId of children) {
      if (!allDescendants.has(childId)) {
        allDescendants.add(childId);
        collectDescendants(childId);
      }
    }
  }

  collectDescendants(ancestorId);

  // Remove the original person
  allDescendants.delete(personId);

  return Array.from(allDescendants);
}

/**
 * Determine if there are multiple relationship paths between two people.
 * This happens in cases like when someone marries a cousin.
 *
 * @param personAId - First person
 * @param personBId - Second person
 * @param graph - FamilyGraph instance
 * @returns true if there are multiple independent paths
 */
export function hasMultipleRelationshipPaths(
  personAId: string,
  personBId: string,
  graph: FamilyGraph
): boolean {
  const commonAncestors = findCommonAncestors(personAId, personBId, graph);

  // If there are multiple common ancestors at different "branches",
  // there are multiple relationship paths
  if (commonAncestors.length <= 1) return false;

  // Check if the common ancestors are independent
  // (i.e., not in an ancestor-descendant relationship with each other)
  const ancestorIds = new Set(commonAncestors.map(ca => ca.ancestorId));

  for (const ca of commonAncestors) {
    const ancestorsOfCA = getAllAncestorsWithDistance(ca.ancestorId, graph);
    for (const ancestorOfCA of ancestorsOfCA.keys()) {
      if (ancestorIds.has(ancestorOfCA) && ancestorOfCA !== ca.ancestorId) {
        // This common ancestor has another common ancestor as its ancestor
        // So they're not independent, remove the descendant one
        // (We keep the one that's further up)
        continue;
      }
    }
  }

  // Count truly independent common ancestors
  const independentAncestors = commonAncestors.filter(ca => {
    // An ancestor is independent if none of the other common ancestors
    // are ancestors of it
    const myAncestors = getAllAncestorsWithDistance(ca.ancestorId, graph);
    for (const otherCA of commonAncestors) {
      if (otherCA.ancestorId !== ca.ancestorId && myAncestors.has(otherCA.ancestorId)) {
        return false;
      }
    }
    return true;
  });

  return independentAncestors.length > 1;
}
