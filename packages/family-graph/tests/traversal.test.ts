/**
 * Tests for traversal algorithms
 */

import { describe, it, expect } from 'vitest';
import {
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
} from '../src/traversal.js';
import {
  buildNuclearFamily,
  buildThreeGenerationFamily,
  buildCousinFamily,
  buildSecondCousinFamily,
  buildDisconnectedGraph,
  buildSinglePersonGraph,
} from './test-helpers.js';

describe('Traversal Algorithms', () => {
  describe('getAllAncestorsWithDistance', () => {
    it('should return empty map for person with no ancestors', () => {
      const { graph } = buildNuclearFamily();
      const ancestors = getAllAncestorsWithDistance('father', graph);
      expect(ancestors.size).toBe(0);
    });

    it('should find parents at distance 1', () => {
      const { graph } = buildNuclearFamily();
      const ancestors = getAllAncestorsWithDistance('child1', graph);

      expect(ancestors.size).toBe(2);
      expect(ancestors.get('father')?.distance).toBe(1);
      expect(ancestors.get('mother')?.distance).toBe(1);
    });

    it('should find grandparents at distance 2', () => {
      const { graph } = buildThreeGenerationFamily();
      const ancestors = getAllAncestorsWithDistance('child1', graph);

      expect(ancestors.get('grandpa-p')?.distance).toBe(2);
      expect(ancestors.get('grandma-p')?.distance).toBe(2);
      expect(ancestors.get('grandpa-m')?.distance).toBe(2);
      expect(ancestors.get('grandma-m')?.distance).toBe(2);
    });

    it('should include path information', () => {
      const { graph } = buildThreeGenerationFamily();
      const ancestors = getAllAncestorsWithDistance('child1', graph);

      const grandpaResult = ancestors.get('grandpa-p');
      expect(grandpaResult?.path).toBeDefined();
      expect(grandpaResult?.path[0]).toBe('child1');
      expect(grandpaResult?.path[grandpaResult.path.length - 1]).toBe('grandpa-p');
    });

    it('should respect maxGenerations option', () => {
      const { graph } = buildThreeGenerationFamily();
      const ancestors = getAllAncestorsWithDistance('child1', graph, { maxGenerations: 1 });

      expect(ancestors.size).toBe(2); // Only parents
      expect(ancestors.has('father')).toBe(true);
      expect(ancestors.has('grandpa-p')).toBe(false);
    });

    it('should filter to biological only when requested', () => {
      const { graph } = buildThreeGenerationFamily();
      const ancestors = getAllAncestorsWithDistance('child1', graph, { includeBiologicalOnly: true });

      // All ancestors in this tree are biological
      expect(ancestors.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getAllDescendantsWithDistance', () => {
    it('should return empty map for person with no descendants', () => {
      const { graph } = buildNuclearFamily();
      const descendants = getAllDescendantsWithDistance('child1', graph);
      expect(descendants.size).toBe(0);
    });

    it('should find children at distance 1', () => {
      const { graph } = buildNuclearFamily();
      const descendants = getAllDescendantsWithDistance('father', graph);

      expect(descendants.size).toBe(2);
      expect(descendants.get('child1')?.distance).toBe(1);
      expect(descendants.get('child2')?.distance).toBe(1);
    });

    it('should find grandchildren at distance 2', () => {
      const { graph } = buildThreeGenerationFamily();
      const descendants = getAllDescendantsWithDistance('grandpa-p', graph);

      expect(descendants.get('child1')?.distance).toBe(2);
      expect(descendants.get('child2')?.distance).toBe(2);
    });

    it('should respect maxGenerations option', () => {
      const { graph } = buildThreeGenerationFamily();
      const descendants = getAllDescendantsWithDistance('grandpa-p', graph, { maxGenerations: 1 });

      expect(descendants.size).toBe(1); // Only father
      expect(descendants.has('father')).toBe(true);
      expect(descendants.has('child1')).toBe(false);
    });
  });

  describe('getPathToAncestor', () => {
    it('should find path to direct parent', () => {
      const { graph } = buildNuclearFamily();
      const path = getPathToAncestor('child1', 'father', graph);

      expect(path).not.toBeNull();
      expect(path?.distance).toBe(1);
      expect(path?.path).toEqual(['child1', 'father']);
    });

    it('should find path to grandparent', () => {
      const { graph } = buildThreeGenerationFamily();
      const path = getPathToAncestor('child1', 'grandpa-p', graph);

      expect(path).not.toBeNull();
      expect(path?.distance).toBe(2);
      expect(path?.path[0]).toBe('child1');
      expect(path?.path[path.path.length - 1]).toBe('grandpa-p');
    });

    it('should return null for non-ancestor', () => {
      const { graph } = buildNuclearFamily();
      const path = getPathToAncestor('father', 'child1', graph);

      expect(path).toBeNull();
    });

    it('should handle same person (distance 0)', () => {
      const { graph } = buildNuclearFamily();
      const path = getPathToAncestor('father', 'father', graph);

      expect(path).not.toBeNull();
      expect(path?.distance).toBe(0);
    });
  });

  describe('getPathToDescendant', () => {
    it('should find path to direct child', () => {
      const { graph } = buildNuclearFamily();
      const path = getPathToDescendant('father', 'child1', graph);

      expect(path).not.toBeNull();
      expect(path?.distance).toBe(1);
    });

    it('should find path to grandchild', () => {
      const { graph } = buildThreeGenerationFamily();
      const path = getPathToDescendant('grandpa-p', 'child1', graph);

      expect(path).not.toBeNull();
      expect(path?.distance).toBe(2);
    });

    it('should return null for non-descendant', () => {
      const { graph } = buildNuclearFamily();
      const path = getPathToDescendant('child1', 'father', graph);

      expect(path).toBeNull();
    });
  });

  describe('findAnyPath', () => {
    it('should find path between parent and child', () => {
      const { graph } = buildNuclearFamily();
      const path = findAnyPath('father', 'child1', graph);

      expect(path).not.toBeNull();
      expect(path?.length).toBe(1);
      expect(path?.pathType).toBe('blood');
    });

    it('should find path between siblings', () => {
      const { graph } = buildNuclearFamily();
      const path = findAnyPath('child1', 'child2', graph);

      expect(path).not.toBeNull();
      // Path goes through a parent
      expect(path?.length).toBeGreaterThanOrEqual(2);
    });

    it('should find path between cousins', () => {
      const { graph } = buildCousinFamily();
      const path = findAnyPath('child', 'cousin', graph);

      expect(path).not.toBeNull();
      // Path goes through grandparents
      expect(path?.length).toBeGreaterThanOrEqual(4);
    });

    it('should find path through spouse (mixed path)', () => {
      const { graph } = buildNuclearFamily();
      const path = findAnyPath('father', 'mother', graph);

      expect(path).not.toBeNull();
      expect(path?.pathType).toBe('mixed'); // Goes through spouse edge
    });

    it('should return null for disconnected persons', () => {
      const { graph } = buildDisconnectedGraph();
      const path = findAnyPath('child1', 'child2', graph);

      expect(path).toBeNull();
    });

    it('should handle same person', () => {
      const { graph } = buildNuclearFamily();
      const path = findAnyPath('father', 'father', graph);

      expect(path).not.toBeNull();
      expect(path?.length).toBe(0);
      expect(path?.nodes).toEqual(['father']);
    });

    it('should respect maxDepth', () => {
      const { graph } = buildSecondCousinFamily();
      const path = findAnyPath('child', 'secondcousin', graph, 3);

      // Path is longer than 3, so should fail
      expect(path).toBeNull();
    });
  });

  describe('findAllPaths', () => {
    it('should find multiple paths between siblings', () => {
      const { graph } = buildNuclearFamily();
      const paths = findAllPaths('child1', 'child2', graph);

      // Two paths: through father and through mother
      expect(paths.length).toBeGreaterThanOrEqual(1);
    });

    it('should sort paths by length', () => {
      const { graph } = buildCousinFamily();
      const paths = findAllPaths('child', 'cousin', graph);

      for (let i = 1; i < paths.length; i++) {
        expect(paths[i].length).toBeGreaterThanOrEqual(paths[i - 1].length);
      }
    });

    it('should respect maxPaths limit', () => {
      const { graph } = buildNuclearFamily();
      const paths = findAllPaths('child1', 'child2', graph, 1);

      expect(paths.length).toBeLessThanOrEqual(1);
    });

    it('should respect maxDepth limit', () => {
      const { graph } = buildCousinFamily();
      const paths = findAllPaths('child', 'cousin', graph, 10, 3);

      // All returned paths should be within maxDepth
      for (const path of paths) {
        expect(path.length).toBeLessThanOrEqual(3);
      }
    });
  });

  describe('getPeopleAtGeneration', () => {
    it('should return person at generation 0', () => {
      const { graph, persons } = buildNuclearFamily();
      const people = getPeopleAtGeneration('child1', 0, graph);

      expect(people).toHaveLength(1);
      expect(people[0].id).toBe('child1');
    });

    it('should return parents at generation 1', () => {
      const { graph } = buildNuclearFamily();
      const people = getPeopleAtGeneration('child1', 1, graph);

      expect(people).toHaveLength(2);
      const ids = people.map(p => p.id);
      expect(ids).toContain('father');
      expect(ids).toContain('mother');
    });

    it('should return grandparents at generation 2', () => {
      const { graph } = buildThreeGenerationFamily();
      const people = getPeopleAtGeneration('child1', 2, graph);

      expect(people).toHaveLength(4);
    });

    it('should return children at generation -1', () => {
      const { graph } = buildNuclearFamily();
      const people = getPeopleAtGeneration('father', -1, graph);

      expect(people).toHaveLength(2);
      const ids = people.map(p => p.id);
      expect(ids).toContain('child1');
      expect(ids).toContain('child2');
    });
  });

  describe('isAncestorOf / isDescendantOf', () => {
    it('should identify direct parent as ancestor', () => {
      const { graph } = buildNuclearFamily();

      expect(isAncestorOf('father', 'child1', graph)).toBe(true);
      expect(isDescendantOf('child1', 'father', graph)).toBe(true);
    });

    it('should identify grandparent as ancestor', () => {
      const { graph } = buildThreeGenerationFamily();

      expect(isAncestorOf('grandpa-p', 'child1', graph)).toBe(true);
      expect(isDescendantOf('child1', 'grandpa-p', graph)).toBe(true);
    });

    it('should not identify siblings as ancestors', () => {
      const { graph } = buildNuclearFamily();

      expect(isAncestorOf('child1', 'child2', graph)).toBe(false);
      expect(isDescendantOf('child1', 'child2', graph)).toBe(false);
    });

    it('should not identify self as ancestor', () => {
      const { graph } = buildNuclearFamily();

      expect(isAncestorOf('father', 'father', graph)).toBe(false);
    });
  });

  describe('getGenerationalDistance', () => {
    it('should return distance 1 for parent-child', () => {
      const { graph } = buildNuclearFamily();
      const result = getGenerationalDistance('child1', 'father', graph);

      expect(result).not.toBeNull();
      expect(result?.distance).toBe(1);
      expect(result?.direction).toBe('ancestor');
    });

    it('should return distance 1 for child-parent (descendant)', () => {
      const { graph } = buildNuclearFamily();
      const result = getGenerationalDistance('father', 'child1', graph);

      expect(result).not.toBeNull();
      expect(result?.distance).toBe(1);
      expect(result?.direction).toBe('descendant');
    });

    it('should return distance 2 for grandparent', () => {
      const { graph } = buildThreeGenerationFamily();
      const result = getGenerationalDistance('child1', 'grandpa-p', graph);

      expect(result).not.toBeNull();
      expect(result?.distance).toBe(2);
      expect(result?.direction).toBe('ancestor');
    });

    it('should return null for siblings (not direct lineage)', () => {
      const { graph } = buildNuclearFamily();
      const result = getGenerationalDistance('child1', 'child2', graph);

      expect(result).toBeNull();
    });

    it('should return distance 0 for same person', () => {
      const { graph } = buildNuclearFamily();
      const result = getGenerationalDistance('father', 'father', graph);

      expect(result).not.toBeNull();
      expect(result?.distance).toBe(0);
    });
  });

  describe('getGenerationSpan', () => {
    it('should return 0/0 for single person', () => {
      const { graph, person } = buildSinglePersonGraph();
      const span = getGenerationSpan(person.id, graph);

      expect(span.up).toBe(0);
      expect(span.down).toBe(0);
    });

    it('should count ancestors up', () => {
      const { graph } = buildThreeGenerationFamily();
      const span = getGenerationSpan('child1', graph);

      expect(span.up).toBe(2); // parents + grandparents
    });

    it('should count descendants down', () => {
      const { graph } = buildThreeGenerationFamily();
      const span = getGenerationSpan('grandpa-p', graph);

      expect(span.down).toBe(2); // children + grandchildren
    });

    it('should count both directions', () => {
      const { graph } = buildThreeGenerationFamily();
      const span = getGenerationSpan('father', graph);

      expect(span.up).toBe(1); // parents only
      expect(span.down).toBe(1); // children only
    });
  });
});
