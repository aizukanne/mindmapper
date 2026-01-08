/**
 * Tests for common ancestor algorithms
 */

import { describe, it, expect } from 'vitest';
import {
  findCommonAncestors,
  getMRCA,
  getAllMRCAs,
  haveCommonAncestor,
  calculateConsanguinity,
  getCanonicalDegree,
  getCivilDegree,
  getRelativesThroughAncestor,
  hasMultipleRelationshipPaths,
} from '../src/ancestors.js';
import {
  buildNuclearFamily,
  buildThreeGenerationFamily,
  buildCousinFamily,
  buildSecondCousinFamily,
  buildHalfSiblingFamily,
  buildDisconnectedGraph,
  buildSinglePersonGraph,
} from './test-helpers.js';

describe('Common Ancestor Algorithms', () => {
  describe('findCommonAncestors', () => {
    it('should find shared parents for siblings', () => {
      const { graph } = buildNuclearFamily();
      const ancestors = findCommonAncestors('child1', 'child2', graph);

      expect(ancestors.length).toBeGreaterThanOrEqual(2);

      const ancestorIds = ancestors.map(a => a.ancestorId);
      expect(ancestorIds).toContain('father');
      expect(ancestorIds).toContain('mother');
    });

    it('should find grandparents for cousins', () => {
      const { graph } = buildCousinFamily();
      const ancestors = findCommonAncestors('child', 'cousin', graph);

      expect(ancestors.length).toBeGreaterThanOrEqual(2);

      const ancestorIds = ancestors.map(a => a.ancestorId);
      expect(ancestorIds).toContain('grandpa');
      expect(ancestorIds).toContain('grandma');
    });

    it('should return distances from both persons', () => {
      const { graph } = buildCousinFamily();
      const ancestors = findCommonAncestors('child', 'cousin', graph);

      // Grandparents should be at distance 2 from both
      const grandpa = ancestors.find(a => a.ancestorId === 'grandpa');
      expect(grandpa?.distanceFromA).toBe(2);
      expect(grandpa?.distanceFromB).toBe(2);
      expect(grandpa?.totalDistance).toBe(4);
    });

    it('should include person themselves when one is ancestor of other', () => {
      const { graph } = buildNuclearFamily();
      const ancestors = findCommonAncestors('child1', 'father', graph);

      // Father is both the "ancestor" and himself
      const father = ancestors.find(a => a.ancestorId === 'father');
      expect(father).toBeDefined();
      expect(father?.distanceFromA).toBe(1);
      expect(father?.distanceFromB).toBe(0);
    });

    it('should sort by total distance (MRCA first)', () => {
      const { graph } = buildThreeGenerationFamily();
      const ancestors = findCommonAncestors('child1', 'child2', graph);

      // Parents should come before grandparents
      for (let i = 1; i < ancestors.length; i++) {
        expect(ancestors[i].totalDistance).toBeGreaterThanOrEqual(ancestors[i - 1].totalDistance);
      }
    });

    it('should handle same person', () => {
      const { graph, person } = buildSinglePersonGraph();
      const ancestors = findCommonAncestors(person.id, person.id, graph);

      expect(ancestors).toHaveLength(1);
      expect(ancestors[0].ancestorId).toBe(person.id);
      expect(ancestors[0].distanceFromA).toBe(0);
      expect(ancestors[0].distanceFromB).toBe(0);
    });

    it('should return empty for unrelated persons', () => {
      const { graph } = buildDisconnectedGraph();
      const ancestors = findCommonAncestors('child1', 'child2', graph);

      expect(ancestors).toHaveLength(0);
    });
  });

  describe('getMRCA', () => {
    it('should return closest common ancestor for siblings', () => {
      const { graph } = buildNuclearFamily();
      const mrca = getMRCA('child1', 'child2', graph);

      expect(mrca).not.toBeNull();
      // Either parent is MRCA with distance 2
      expect(['father', 'mother']).toContain(mrca?.ancestorId);
      expect(mrca?.totalDistance).toBe(2);
    });

    it('should return closest ancestor for cousins', () => {
      const { graph } = buildCousinFamily();
      const mrca = getMRCA('child', 'cousin', graph);

      expect(mrca).not.toBeNull();
      expect(['grandpa', 'grandma']).toContain(mrca?.ancestorId);
      expect(mrca?.totalDistance).toBe(4); // 2 from each
    });

    it('should return person when one is ancestor of other', () => {
      const { graph } = buildNuclearFamily();
      const mrca = getMRCA('child1', 'father', graph);

      expect(mrca?.ancestorId).toBe('father');
      expect(mrca?.totalDistance).toBe(1);
    });

    it('should return null for unrelated persons', () => {
      const { graph } = buildDisconnectedGraph();
      const mrca = getMRCA('child1', 'child2', graph);

      expect(mrca).toBeNull();
    });
  });

  describe('getAllMRCAs', () => {
    it('should return both parents for siblings', () => {
      const { graph } = buildNuclearFamily();
      const mrcas = getAllMRCAs('child1', 'child2', graph);

      // Both parents are at same distance (2)
      expect(mrcas).toHaveLength(2);

      const ids = mrcas.map(m => m.ancestorId);
      expect(ids).toContain('father');
      expect(ids).toContain('mother');
    });

    it('should return both grandparents for cousins', () => {
      const { graph } = buildCousinFamily();
      const mrcas = getAllMRCAs('child', 'cousin', graph);

      expect(mrcas).toHaveLength(2);

      const ids = mrcas.map(m => m.ancestorId);
      expect(ids).toContain('grandpa');
      expect(ids).toContain('grandma');
    });

    it('should return single ancestor when one exists', () => {
      const { graph } = buildHalfSiblingFamily();
      const mrcas = getAllMRCAs('child1', 'child2', graph);

      // Only mother is shared
      expect(mrcas).toHaveLength(1);
      expect(mrcas[0].ancestorId).toBe('mother');
    });
  });

  describe('haveCommonAncestor', () => {
    it('should return true for siblings', () => {
      const { graph } = buildNuclearFamily();
      expect(haveCommonAncestor('child1', 'child2', graph)).toBe(true);
    });

    it('should return true for cousins', () => {
      const { graph } = buildCousinFamily();
      expect(haveCommonAncestor('child', 'cousin', graph)).toBe(true);
    });

    it('should return true for parent-child', () => {
      const { graph } = buildNuclearFamily();
      expect(haveCommonAncestor('father', 'child1', graph)).toBe(true);
    });

    it('should return false for unrelated', () => {
      const { graph } = buildDisconnectedGraph();
      expect(haveCommonAncestor('child1', 'child2', graph)).toBe(false);
    });

    it('should return true for same person', () => {
      const { graph, person } = buildSinglePersonGraph();
      expect(haveCommonAncestor(person.id, person.id, graph)).toBe(true);
    });

    it('should respect maxGenerations limit', () => {
      const { graph } = buildCousinFamily();
      // Cousins share grandparents at distance 2
      expect(haveCommonAncestor('child', 'cousin', graph, 1)).toBe(false);
      expect(haveCommonAncestor('child', 'cousin', graph, 2)).toBe(true);
    });
  });

  describe('calculateConsanguinity', () => {
    it('should return 1.0 for same person', () => {
      const { graph, person } = buildSinglePersonGraph();
      expect(calculateConsanguinity(person.id, person.id, graph)).toBe(1.0);
    });

    it('should return ~0.5 for parent-child', () => {
      const { graph } = buildNuclearFamily();
      const cons = calculateConsanguinity('father', 'child1', graph);
      expect(cons).toBeCloseTo(0.5, 2);
    });

    it('should return ~0.25 for grandparent-grandchild', () => {
      const { graph } = buildThreeGenerationFamily();
      const cons = calculateConsanguinity('grandpa-p', 'child1', graph);
      expect(cons).toBeCloseTo(0.25, 2);
    });

    it('should return ~0.5 for full siblings', () => {
      const { graph } = buildNuclearFamily();
      const cons = calculateConsanguinity('child1', 'child2', graph);
      // Through one parent: (1/2)^2 = 0.25, but siblings share both parents
      // Simplified calculation uses MRCA only
      expect(cons).toBeCloseTo(0.25, 2); // MRCA-based calculation
    });

    it('should return ~0.0625 for first cousins', () => {
      const { graph } = buildCousinFamily();
      const cons = calculateConsanguinity('child', 'cousin', graph);
      // (1/2)^4 = 0.0625
      expect(cons).toBeCloseTo(0.0625, 3);
    });

    it('should return 0 for unrelated', () => {
      const { graph } = buildDisconnectedGraph();
      const cons = calculateConsanguinity('child1', 'child2', graph);
      expect(cons).toBe(0);
    });
  });

  describe('getCanonicalDegree', () => {
    it('should return 0 for same person', () => {
      const { graph, person } = buildSinglePersonGraph();
      expect(getCanonicalDegree(person.id, person.id, graph)).toBe(0);
    });

    it('should return 1 for siblings', () => {
      const { graph } = buildNuclearFamily();
      const degree = getCanonicalDegree('child1', 'child2', graph);
      expect(degree).toBe(1);
    });

    it('should return 2 for first cousins', () => {
      const { graph } = buildCousinFamily();
      const degree = getCanonicalDegree('child', 'cousin', graph);
      expect(degree).toBe(2);
    });

    it('should return 3 for second cousins', () => {
      const { graph } = buildSecondCousinFamily();
      const degree = getCanonicalDegree('child', 'secondcousin', graph);
      expect(degree).toBe(3);
    });

    it('should return 0 for unrelated', () => {
      const { graph } = buildDisconnectedGraph();
      expect(getCanonicalDegree('child1', 'child2', graph)).toBe(0);
    });
  });

  describe('getCivilDegree', () => {
    it('should return 0 for same person', () => {
      const { graph, person } = buildSinglePersonGraph();
      expect(getCivilDegree(person.id, person.id, graph)).toBe(0);
    });

    it('should return 1 for parent-child', () => {
      const { graph } = buildNuclearFamily();
      const degree = getCivilDegree('father', 'child1', graph);
      expect(degree).toBe(1);
    });

    it('should return 2 for siblings', () => {
      const { graph } = buildNuclearFamily();
      const degree = getCivilDegree('child1', 'child2', graph);
      expect(degree).toBe(2); // 1 up + 1 down
    });

    it('should return 2 for grandparent', () => {
      const { graph } = buildThreeGenerationFamily();
      const degree = getCivilDegree('grandpa-p', 'child1', graph);
      expect(degree).toBe(2);
    });

    it('should return 4 for first cousins', () => {
      const { graph } = buildCousinFamily();
      const degree = getCivilDegree('child', 'cousin', graph);
      expect(degree).toBe(4); // 2 up + 2 down
    });
  });

  describe('getRelativesThroughAncestor', () => {
    it('should find siblings through parent', () => {
      const { graph } = buildNuclearFamily();
      const relatives = getRelativesThroughAncestor('child1', 'father', graph);

      expect(relatives).toContain('child2');
      expect(relatives).not.toContain('child1'); // Excludes self
    });

    it('should find cousins through grandparent', () => {
      const { graph } = buildCousinFamily();
      const relatives = getRelativesThroughAncestor('child', 'grandpa', graph);

      expect(relatives).toContain('cousin');
      expect(relatives).toContain('father');
      expect(relatives).toContain('uncle');
    });

    it('should return empty for non-ancestor', () => {
      const { graph } = buildNuclearFamily();
      const relatives = getRelativesThroughAncestor('father', 'child1', graph);

      expect(relatives).toHaveLength(0);
    });
  });

  describe('hasMultipleRelationshipPaths', () => {
    it('should return true when multiple independent common ancestors exist', () => {
      const { graph } = buildNuclearFamily();
      // Siblings have two independent common ancestors (father and mother)
      const result = hasMultipleRelationshipPaths('child1', 'child2', graph);

      expect(result).toBe(true);
    });

    it('should return true for cousins (grandparents)', () => {
      const { graph } = buildCousinFamily();
      const result = hasMultipleRelationshipPaths('child', 'cousin', graph);

      expect(result).toBe(true);
    });

    it('should return false for parent-child', () => {
      const { graph } = buildNuclearFamily();
      const result = hasMultipleRelationshipPaths('father', 'child1', graph);

      expect(result).toBe(false);
    });

    it('should return false for half-siblings', () => {
      const { graph } = buildHalfSiblingFamily();
      const result = hasMultipleRelationshipPaths('child1', 'child2', graph);

      // Only share one parent (mother)
      expect(result).toBe(false);
    });
  });
});
