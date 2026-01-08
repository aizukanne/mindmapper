/**
 * Traversal algorithms for the family graph.
 *
 * Uses BFS (Breadth-First Search) for shortest path guarantees.
 * All traversals work with generational distances.
 */

import type { FamilyGraph, EdgeMetadata } from './graph.js';
import type { PersonNode, RelationshipPath, PathEdge, FoundationalRelationType } from './types.js';

/**
 * Result of ancestor/descendant traversal with distance information
 */
export interface TraversalResult {
  personId: string;
  person?: PersonNode;
  distance: number;  // Generational distance from starting person
  path: string[];    // Path of person IDs from start to this person
  pathMetadata: EdgeMetadata[];  // Metadata for each edge in the path
}

/**
 * Get all ancestors of a person with their generational distances.
 * Uses BFS to ensure shortest paths are found first.
 *
 * @param personId - Starting person
 * @param graph - FamilyGraph instance
 * @param options - Traversal options
 * @returns Map of ancestorId -> distance (generations)
 */
export function getAllAncestorsWithDistance(
  personId: string,
  graph: FamilyGraph,
  options: {
    maxGenerations?: number;
    includeBiologicalOnly?: boolean;
  } = {}
): Map<string, TraversalResult> {
  const { maxGenerations = Infinity, includeBiologicalOnly = false } = options;

  const ancestors = new Map<string, TraversalResult>();
  const visited = new Set<string>();

  // BFS queue: [personId, distance, path, pathMetadata]
  const queue: Array<{
    id: string;
    distance: number;
    path: string[];
    pathMetadata: EdgeMetadata[];
  }> = [{
    id: personId,
    distance: 0,
    path: [personId],
    pathMetadata: [],
  }];

  while (queue.length > 0) {
    const { id: currentId, distance, path, pathMetadata } = queue.shift()!;

    if (visited.has(currentId)) continue;
    visited.add(currentId);

    // Don't add the starting person as an ancestor
    if (currentId !== personId) {
      ancestors.set(currentId, {
        personId: currentId,
        person: graph.getPerson(currentId),
        distance,
        path,
        pathMetadata,
      });
    }

    // Stop if we've reached max generations
    if (distance >= maxGenerations) continue;

    // Get parents
    const parents = includeBiologicalOnly
      ? graph.getBiologicalParents(currentId).map(p => ({
          person: p,
          metadata: { relationshipType: 'PARENT' as FoundationalRelationType, isAdoptive: false, isStep: false, isFoster: false }
        }))
      : graph.getParents(currentId);

    for (const { person: parent, metadata } of parents) {
      if (!visited.has(parent.id)) {
        queue.push({
          id: parent.id,
          distance: distance + 1,
          path: [...path, parent.id],
          pathMetadata: [...pathMetadata, metadata],
        });
      }
    }
  }

  return ancestors;
}

/**
 * Get all descendants of a person with their generational distances.
 * Uses BFS to ensure shortest paths are found first.
 *
 * @param personId - Starting person
 * @param graph - FamilyGraph instance
 * @param options - Traversal options
 * @returns Map of descendantId -> TraversalResult
 */
export function getAllDescendantsWithDistance(
  personId: string,
  graph: FamilyGraph,
  options: {
    maxGenerations?: number;
  } = {}
): Map<string, TraversalResult> {
  const { maxGenerations = Infinity } = options;

  const descendants = new Map<string, TraversalResult>();
  const visited = new Set<string>();

  const queue: Array<{
    id: string;
    distance: number;
    path: string[];
    pathMetadata: EdgeMetadata[];
  }> = [{
    id: personId,
    distance: 0,
    path: [personId],
    pathMetadata: [],
  }];

  while (queue.length > 0) {
    const { id: currentId, distance, path, pathMetadata } = queue.shift()!;

    if (visited.has(currentId)) continue;
    visited.add(currentId);

    // Don't add the starting person as a descendant
    if (currentId !== personId) {
      descendants.set(currentId, {
        personId: currentId,
        person: graph.getPerson(currentId),
        distance,
        path,
        pathMetadata,
      });
    }

    // Stop if we've reached max generations
    if (distance >= maxGenerations) continue;

    // Get children
    const children = graph.getChildren(currentId);

    for (const { person: child, metadata } of children) {
      if (!visited.has(child.id)) {
        queue.push({
          id: child.id,
          distance: distance + 1,
          path: [...path, child.id],
          pathMetadata: [...pathMetadata, metadata],
        });
      }
    }
  }

  return descendants;
}

/**
 * Get the path from a person to a specific ancestor.
 * Returns null if the target is not an ancestor.
 *
 * @param personId - Starting person
 * @param ancestorId - Target ancestor
 * @param graph - FamilyGraph instance
 * @returns Path information or null
 */
export function getPathToAncestor(
  personId: string,
  ancestorId: string,
  graph: FamilyGraph
): TraversalResult | null {
  if (personId === ancestorId) {
    return {
      personId: ancestorId,
      person: graph.getPerson(ancestorId),
      distance: 0,
      path: [personId],
      pathMetadata: [],
    };
  }

  const ancestors = getAllAncestorsWithDistance(personId, graph);
  return ancestors.get(ancestorId) ?? null;
}

/**
 * Get the path from a person to a specific descendant.
 * Returns null if the target is not a descendant.
 *
 * @param personId - Starting person
 * @param descendantId - Target descendant
 * @param graph - FamilyGraph instance
 * @returns Path information or null
 */
export function getPathToDescendant(
  personId: string,
  descendantId: string,
  graph: FamilyGraph
): TraversalResult | null {
  if (personId === descendantId) {
    return {
      personId: descendantId,
      person: graph.getPerson(descendantId),
      distance: 0,
      path: [personId],
      pathMetadata: [],
    };
  }

  const descendants = getAllDescendantsWithDistance(personId, graph);
  return descendants.get(descendantId) ?? null;
}

/**
 * Find any path between two people using BFS.
 * This traverses all relationship types (parent, child, spouse, sibling).
 *
 * @param personAId - Starting person
 * @param personBId - Target person
 * @param graph - FamilyGraph instance
 * @param maxDepth - Maximum path length to search
 * @returns Shortest path or null if no path exists
 */
export function findAnyPath(
  personAId: string,
  personBId: string,
  graph: FamilyGraph,
  maxDepth: number = 15
): RelationshipPath | null {
  if (personAId === personBId) {
    return {
      nodes: [personAId],
      edges: [],
      length: 0,
      pathType: 'blood',
    };
  }

  const visited = new Set<string>();
  const queue: Array<{
    id: string;
    path: string[];
    edges: PathEdge[];
    hasMarriage: boolean;
  }> = [{
    id: personAId,
    path: [personAId],
    edges: [],
    hasMarriage: false,
  }];

  while (queue.length > 0) {
    const { id: currentId, path, edges, hasMarriage } = queue.shift()!;

    if (path.length > maxDepth) continue;

    if (visited.has(currentId)) continue;
    visited.add(currentId);

    // Check if we reached the target
    if (currentId === personBId) {
      return {
        nodes: path,
        edges,
        length: path.length - 1,
        pathType: hasMarriage ? 'mixed' : 'blood',
      };
    }

    // Get all connections
    const connections = graph.getAllConnections(currentId);

    for (const conn of connections) {
      if (!visited.has(conn.personId)) {
        const edge: PathEdge = {
          fromId: currentId,
          toId: conn.personId,
          relationshipType: conn.metadata.relationshipType,
        };

        queue.push({
          id: conn.personId,
          path: [...path, conn.personId],
          edges: [...edges, edge],
          hasMarriage: hasMarriage || conn.connectionType === 'spouse',
        });
      }
    }
  }

  return null;
}

/**
 * Find all paths between two people up to a maximum length.
 * Useful for understanding complex family connections.
 *
 * @param personAId - Starting person
 * @param personBId - Target person
 * @param graph - FamilyGraph instance
 * @param maxPaths - Maximum number of paths to return
 * @param maxDepth - Maximum path length to search
 * @returns Array of paths
 */
export function findAllPaths(
  personAId: string,
  personBId: string,
  graph: FamilyGraph,
  maxPaths: number = 5,
  maxDepth: number = 10
): RelationshipPath[] {
  const paths: RelationshipPath[] = [];

  // DFS to find all paths
  function dfs(
    currentId: string,
    targetId: string,
    path: string[],
    edges: PathEdge[],
    visited: Set<string>,
    hasMarriage: boolean
  ): void {
    if (paths.length >= maxPaths) return;
    if (path.length > maxDepth) return;

    if (currentId === targetId) {
      paths.push({
        nodes: [...path],
        edges: [...edges],
        length: path.length - 1,
        pathType: hasMarriage ? 'mixed' : 'blood',
      });
      return;
    }

    const connections = graph.getAllConnections(currentId);

    for (const conn of connections) {
      if (!visited.has(conn.personId)) {
        visited.add(conn.personId);

        const edge: PathEdge = {
          fromId: currentId,
          toId: conn.personId,
          relationshipType: conn.metadata.relationshipType,
        };

        dfs(
          conn.personId,
          targetId,
          [...path, conn.personId],
          [...edges, edge],
          visited,
          hasMarriage || conn.connectionType === 'spouse'
        );

        visited.delete(conn.personId);
      }
    }
  }

  const visited = new Set<string>([personAId]);
  dfs(personAId, personBId, [personAId], [], visited, false);

  // Sort by path length
  return paths.sort((a, b) => a.length - b.length);
}

/**
 * Get all people at a specific generational distance (ancestors or descendants).
 *
 * @param personId - Starting person
 * @param generations - Number of generations (positive = ancestors, negative = descendants)
 * @param graph - FamilyGraph instance
 * @returns Array of people at that generation
 */
export function getPeopleAtGeneration(
  personId: string,
  generations: number,
  graph: FamilyGraph
): PersonNode[] {
  if (generations === 0) {
    const person = graph.getPerson(personId);
    return person ? [person] : [];
  }

  const traversalResult = generations > 0
    ? getAllAncestorsWithDistance(personId, graph, { maxGenerations: Math.abs(generations) })
    : getAllDescendantsWithDistance(personId, graph, { maxGenerations: Math.abs(generations) });

  const targetDistance = Math.abs(generations);

  return Array.from(traversalResult.values())
    .filter(r => r.distance === targetDistance)
    .map(r => r.person)
    .filter((p): p is PersonNode => p !== undefined);
}

/**
 * Check if person A is an ancestor of person B.
 *
 * @param ancestorId - Potential ancestor
 * @param descendantId - Potential descendant
 * @param graph - FamilyGraph instance
 * @returns true if ancestorId is an ancestor of descendantId
 */
export function isAncestorOf(
  ancestorId: string,
  descendantId: string,
  graph: FamilyGraph
): boolean {
  if (ancestorId === descendantId) return false;

  const ancestors = getAllAncestorsWithDistance(descendantId, graph);
  return ancestors.has(ancestorId);
}

/**
 * Check if person A is a descendant of person B.
 *
 * @param descendantId - Potential descendant
 * @param ancestorId - Potential ancestor
 * @param graph - FamilyGraph instance
 * @returns true if descendantId is a descendant of ancestorId
 */
export function isDescendantOf(
  descendantId: string,
  ancestorId: string,
  graph: FamilyGraph
): boolean {
  return isAncestorOf(ancestorId, descendantId, graph);
}

/**
 * Get the generational distance between two people if one is an ancestor of the other.
 * Returns null if they are not in a direct ancestor-descendant relationship.
 *
 * @param personAId - First person
 * @param personBId - Second person
 * @param graph - FamilyGraph instance
 * @returns { distance, direction } or null
 */
export function getGenerationalDistance(
  personAId: string,
  personBId: string,
  graph: FamilyGraph
): { distance: number; direction: 'ancestor' | 'descendant' } | null {
  if (personAId === personBId) {
    return { distance: 0, direction: 'ancestor' };
  }

  // Check if B is an ancestor of A
  const ancestorsOfA = getAllAncestorsWithDistance(personAId, graph);
  if (ancestorsOfA.has(personBId)) {
    return {
      distance: ancestorsOfA.get(personBId)!.distance,
      direction: 'ancestor',
    };
  }

  // Check if B is a descendant of A
  const descendantsOfA = getAllDescendantsWithDistance(personAId, graph);
  if (descendantsOfA.has(personBId)) {
    return {
      distance: descendantsOfA.get(personBId)!.distance,
      direction: 'descendant',
    };
  }

  return null;
}

/**
 * Get the count of generations in each direction from a person.
 *
 * @param personId - Starting person
 * @param graph - FamilyGraph instance
 * @returns { up: number, down: number }
 */
export function getGenerationSpan(
  personId: string,
  graph: FamilyGraph
): { up: number; down: number } {
  const ancestors = getAllAncestorsWithDistance(personId, graph);
  const descendants = getAllDescendantsWithDistance(personId, graph);

  let maxUp = 0;
  let maxDown = 0;

  for (const result of ancestors.values()) {
    maxUp = Math.max(maxUp, result.distance);
  }

  for (const result of descendants.values()) {
    maxDown = Math.max(maxDown, result.distance);
  }

  return { up: maxUp, down: maxDown };
}
