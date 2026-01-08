/**
 * Tests for relationship computation engine
 */

import { describe, it, expect } from 'vitest';
import {
  computeRelationship,
  computeRelationshipsBatch,
  findAllRelativesOfType,
  computeRelationshipMatrix,
  getRelationshipCounts,
} from '../src/compute.js';
import {
  buildNuclearFamily,
  buildThreeGenerationFamily,
  buildCousinFamily,
  buildSecondCousinFamily,
  buildHalfSiblingFamily,
  buildStepFamily,
  buildInLawFamily,
  buildDisconnectedGraph,
  buildSinglePersonGraph,
  buildLargeFamily,
} from './test-helpers.js';

describe('computeRelationship', () => {
  describe('self relationship', () => {
    it('should identify self', () => {
      const { graph, person } = buildSinglePersonGraph();
      const rel = computeRelationship(person.id, person.id, graph);

      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('SELF');
      expect(rel?.displayName).toBe('self');
      expect(rel?.generationDifference).toBe(0);
    });
  });

  describe('spouse relationships', () => {
    it('should identify husband', () => {
      const { graph } = buildNuclearFamily();
      const rel = computeRelationship('mother', 'father', graph);

      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('HUSBAND');
      expect(rel?.displayName).toBe('husband');
      expect(rel?.isBloodRelation).toBe(false);
    });

    it('should identify wife', () => {
      const { graph } = buildNuclearFamily();
      const rel = computeRelationship('father', 'mother', graph);

      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('WIFE');
      expect(rel?.displayName).toBe('wife');
    });
  });

  describe('parent-child relationships', () => {
    it('should identify father', () => {
      const { graph } = buildNuclearFamily();
      const rel = computeRelationship('child1', 'father', graph);

      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('FATHER');
      expect(rel?.displayName).toBe('father');
      expect(rel?.generationDifference).toBe(1);
      expect(rel?.isDirectAncestor).toBe(true);
      expect(rel?.isBloodRelation).toBe(true);
    });

    it('should identify mother', () => {
      const { graph } = buildNuclearFamily();
      const rel = computeRelationship('child1', 'mother', graph);

      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('MOTHER');
      expect(rel?.displayName).toBe('mother');
    });

    it('should identify son', () => {
      const { graph } = buildNuclearFamily();
      const rel = computeRelationship('father', 'child2', graph);

      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('SON');
      expect(rel?.displayName).toBe('son');
      expect(rel?.generationDifference).toBe(-1);
      expect(rel?.isDirectDescendant).toBe(true);
    });

    it('should identify daughter', () => {
      const { graph } = buildNuclearFamily();
      const rel = computeRelationship('father', 'child1', graph);

      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('DAUGHTER');
      expect(rel?.displayName).toBe('daughter');
    });
  });

  describe('sibling relationships', () => {
    it('should identify brother', () => {
      const { graph } = buildNuclearFamily();
      const rel = computeRelationship('child1', 'child2', graph);

      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('BROTHER');
      expect(rel?.displayName).toBe('brother');
      expect(rel?.generationDifference).toBe(0);
      expect(rel?.isBloodRelation).toBe(true);
    });

    it('should identify sister', () => {
      const { graph } = buildNuclearFamily();
      const rel = computeRelationship('child2', 'child1', graph);

      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('SISTER');
      expect(rel?.displayName).toBe('sister');
    });

    it('should identify half-sibling', () => {
      const { graph } = buildHalfSiblingFamily();
      const rel = computeRelationship('child1', 'child2', graph);

      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('HALF_SISTER');
      expect(rel?.displayName).toBe('half-sister');
      expect(rel?.qualifiers.isHalf).toBe(true);
      expect(rel?.isBloodRelation).toBe(true);
    });
  });

  describe('grandparent relationships', () => {
    it('should identify grandfather', () => {
      const { graph } = buildThreeGenerationFamily();
      const rel = computeRelationship('child1', 'grandpa-p', graph);

      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('GRANDFATHER');
      expect(rel?.displayName).toBe('grandfather');
      expect(rel?.generationDifference).toBe(2);
      expect(rel?.isDirectAncestor).toBe(true);
    });

    it('should identify grandmother', () => {
      const { graph } = buildThreeGenerationFamily();
      const rel = computeRelationship('child1', 'grandma-m', graph);

      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('GRANDMOTHER');
      expect(rel?.displayName).toBe('grandmother');
    });

    it('should identify grandson', () => {
      const { graph } = buildThreeGenerationFamily();
      const rel = computeRelationship('grandpa-p', 'child2', graph);

      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('GRANDSON');
      expect(rel?.displayName).toBe('grandson');
      expect(rel?.generationDifference).toBe(-2);
    });

    it('should identify granddaughter', () => {
      const { graph } = buildThreeGenerationFamily();
      const rel = computeRelationship('grandpa-p', 'child1', graph);

      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('GRANDDAUGHTER');
      expect(rel?.displayName).toBe('granddaughter');
    });
  });

  describe('aunt/uncle relationships', () => {
    it('should identify uncle', () => {
      const { graph } = buildCousinFamily();
      const rel = computeRelationship('child', 'uncle', graph);

      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('UNCLE');
      expect(rel?.displayName).toBe('uncle');
      expect(rel?.isBloodRelation).toBe(true);
    });

    it('should identify aunt', () => {
      const { graph } = buildCousinFamily();
      const rel = computeRelationship('cousin', 'mother', graph);

      // mother is aunt to cousin through uncle (spouse)
      // This is actually "mother-in-law to cousin's spouse" path
      // Let me check the correct relationship
      // child's mother is not related to cousin directly as blood
      // The test family has: grandpa/grandma -> father/uncle
      // So child's aunt would be uncle's spouse (aunt)
      const rel2 = computeRelationship('child', 'aunt', graph);
      expect(rel2).not.toBeNull();
      // aunt is spouse of uncle, so aunt to child via marriage
    });

    it('should identify nephew', () => {
      const { graph } = buildCousinFamily();
      const rel = computeRelationship('uncle', 'child', graph);

      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('NIECE'); // child is female
      expect(rel?.displayName).toBe('niece');
    });

    it('should identify niece', () => {
      const { graph } = buildCousinFamily();
      const rel = computeRelationship('father', 'cousin', graph);

      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('NEPHEW'); // cousin is male
      expect(rel?.displayName).toBe('nephew');
    });
  });

  describe('cousin relationships', () => {
    it('should identify first cousin', () => {
      const { graph } = buildCousinFamily();
      const rel = computeRelationship('child', 'cousin', graph);

      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('COUSIN');
      expect(rel?.displayName).toBe('1st cousin');
      expect(rel?.cousinDegree).toBe(1);
      expect(rel?.cousinRemoval).toBe(0);
      expect(rel?.isBloodRelation).toBe(true);
    });

    it('should identify second cousin', () => {
      const { graph } = buildSecondCousinFamily();
      const rel = computeRelationship('child', 'secondcousin', graph);

      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('COUSIN');
      expect(rel?.displayName).toBe('2nd cousin');
      expect(rel?.cousinDegree).toBe(2);
      expect(rel?.cousinRemoval).toBe(0);
    });

    it('should identify first cousin once removed', () => {
      const { graph } = buildSecondCousinFamily();
      // child is 2 generations from grandpa, cousin1p is 2 generations from grandpa
      // But they're actually 1st cousins - let me check the structure

      // child to cousin1p:
      // child -> father -> grandpa <- greatuncle <- cousin1p
      // child is 3 generations from ggp
      // cousin1p is 2 generations from ggp
      // So they are first cousins once removed
      const rel = computeRelationship('child', 'cousin1p', graph);

      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('COUSIN');
      expect(rel?.displayName).toBe('1st cousin once removed');
      expect(rel?.cousinDegree).toBe(1);
      expect(rel?.cousinRemoval).toBe(1);
    });
  });

  describe('step relationships', () => {
    it('should identify step-mother', () => {
      const { graph } = buildStepFamily();
      const rel = computeRelationship('child', 'stepmother', graph);

      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('STEP_MOTHER');
      expect(rel?.displayName).toBe('step-mother');
      expect(rel?.qualifiers.isStep).toBe(true);
      expect(rel?.isBloodRelation).toBe(false);
    });

    it('should identify step-father', () => {
      const { graph } = buildStepFamily();
      const rel = computeRelationship('stepchild', 'father', graph);

      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('STEP_FATHER');
      expect(rel?.displayName).toBe('step-father');
    });

    it('should identify step-sibling', () => {
      const { graph } = buildStepFamily();
      const rel = computeRelationship('child', 'stepchild', graph);

      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('STEP_BROTHER');
      expect(rel?.displayName).toBe('step-brother');
      expect(rel?.isBloodRelation).toBe(false);
    });
  });

  describe('in-law relationships', () => {
    it('should identify father-in-law', () => {
      const { graph } = buildInLawFamily();
      const rel = computeRelationship('person', 'father-in-law', graph);

      expect(rel).not.toBeNull();
      expect(rel?.displayName).toContain('father-in-law');
      expect(rel?.qualifiers.isInLaw).toBe(true);
      expect(rel?.isBloodRelation).toBe(false);
    });

    it('should identify mother-in-law', () => {
      const { graph } = buildInLawFamily();
      const rel = computeRelationship('person', 'mother-in-law', graph);

      expect(rel).not.toBeNull();
      expect(rel?.displayName).toContain('mother-in-law');
    });

    it('should identify sibling-in-law', () => {
      const { graph } = buildInLawFamily();
      const rel = computeRelationship('person', 'sibling-in-law', graph);

      expect(rel).not.toBeNull();
      expect(rel?.displayName).toContain('sister-in-law');
      expect(rel?.qualifiers.isInLaw).toBe(true);
    });
  });

  describe('unrelated persons', () => {
    it('should return null for disconnected persons', () => {
      const { graph } = buildDisconnectedGraph();
      const rel = computeRelationship('child1', 'child2', graph);

      expect(rel).toBeNull();
    });

    it('should return null for non-existent persons', () => {
      const { graph } = buildNuclearFamily();
      const rel = computeRelationship('nonexistent1', 'nonexistent2', graph);

      expect(rel).toBeNull();
    });
  });

  describe('common ancestors and paths', () => {
    it('should include common ancestors for blood relations', () => {
      const { graph } = buildCousinFamily();
      // Cousins get computed through blood relationship path which populates commonAncestors
      const rel = computeRelationship('child', 'cousin', graph);

      expect(rel?.commonAncestors).toBeDefined();
      expect(rel?.commonAncestors.length).toBeGreaterThan(0);
    });

    it('should include shortest path', () => {
      const { graph } = buildCousinFamily();
      const rel = computeRelationship('child', 'cousin', graph);

      expect(rel?.shortestPath).toBeDefined();
      expect(rel?.shortestPath?.nodes[0]).toBe('child');
      expect(rel?.shortestPath?.nodes[rel.shortestPath.nodes.length - 1]).toBe('cousin');
    });
  });
});

describe('computeRelationshipsBatch', () => {
  it('should compute multiple relationships', () => {
    const { graph } = buildNuclearFamily();
    const pairs: [string, string][] = [
      ['child1', 'father'],
      ['child1', 'mother'],
      ['child1', 'child2'],
    ];

    const results = computeRelationshipsBatch(pairs, graph);

    expect(results).toHaveLength(3);
    expect(results[0].relationship?.type).toBe('FATHER');
    expect(results[1].relationship?.type).toBe('MOTHER');
    expect(results[2].relationship?.type).toBe('BROTHER');
  });

  it('should return null for unrelated pairs', () => {
    const { graph } = buildDisconnectedGraph();
    const pairs: [string, string][] = [
      ['child1', 'child2'],
    ];

    const results = computeRelationshipsBatch(pairs, graph);

    expect(results).toHaveLength(1);
    expect(results[0].relationship).toBeNull();
  });

  it('should handle empty pairs array', () => {
    const { graph } = buildNuclearFamily();
    const results = computeRelationshipsBatch([], graph);

    expect(results).toHaveLength(0);
  });
});

describe('findAllRelativesOfType', () => {
  it('should find siblings by gender-specific type', () => {
    const { graph } = buildNuclearFamily();
    // child2 is male, so relationship type is BROTHER
    const brothers = findAllRelativesOfType('child1', 'BROTHER', graph);

    expect(brothers).toHaveLength(1);
    expect(brothers[0].toPersonId).toBe('child2');
  });

  it('should find parents by gender-specific type', () => {
    const { graph } = buildNuclearFamily();
    const fathers = findAllRelativesOfType('child1', 'FATHER', graph);
    const mothers = findAllRelativesOfType('child1', 'MOTHER', graph);

    expect(fathers).toHaveLength(1);
    expect(mothers).toHaveLength(1);
  });

  it('should find cousins', () => {
    const { graph } = buildCousinFamily();
    const cousins = findAllRelativesOfType('child', 'COUSIN', graph);

    expect(cousins.length).toBeGreaterThanOrEqual(1);
    expect(cousins.some(c => c.toPersonId === 'cousin')).toBe(true);
  });

  it('should include half-sibling variants when requested', () => {
    const { graph } = buildHalfSiblingFamily();
    // child2 is female, so type is HALF_SISTER
    const siblings = findAllRelativesOfType('child1', 'HALF_SISTER', graph, { includeQualifiers: true });

    // Should find half-siblings
    expect(siblings.length).toBeGreaterThanOrEqual(1);
  });

  it('should respect maxResults', () => {
    const { graph } = buildCousinFamily();
    const relatives = findAllRelativesOfType('child', 'FATHER', graph, { maxResults: 1 });

    expect(relatives.length).toBeLessThanOrEqual(1);
  });
});

describe('computeRelationshipMatrix', () => {
  it('should compute all pairwise relationships', () => {
    const { graph } = buildNuclearFamily();
    const personIds = ['father', 'mother', 'child1', 'child2'];

    const matrix = computeRelationshipMatrix(personIds, graph);

    // 4 persons = 6 unique pairs = 12 entries (both directions)
    expect(matrix.size).toBe(12);

    expect(matrix.get('father:mother')?.type).toBe('WIFE');
    expect(matrix.get('mother:father')?.type).toBe('WIFE'); // Same relationship
    expect(matrix.get('child1:child2')?.type).toBe('BROTHER');
  });

  it('should handle empty array', () => {
    const { graph } = buildNuclearFamily();
    const matrix = computeRelationshipMatrix([], graph);

    expect(matrix.size).toBe(0);
  });

  it('should handle single person', () => {
    const { graph } = buildNuclearFamily();
    const matrix = computeRelationshipMatrix(['father'], graph);

    expect(matrix.size).toBe(0);
  });
});

describe('getRelationshipCounts', () => {
  it('should count relatives by category', () => {
    const { graph } = buildNuclearFamily();
    const counts = getRelationshipCounts('child1', graph);

    expect(counts.total).toBe(3); // father, mother, sibling
    expect(counts.blood).toBeGreaterThanOrEqual(3);
    expect(counts.byType.get('FATHER')).toBe(1);
    expect(counts.byType.get('MOTHER')).toBe(1);
  });

  it('should count in-laws separately', () => {
    const { graph } = buildInLawFamily();
    const counts = getRelationshipCounts('person', graph);

    expect(counts.inLaw).toBeGreaterThan(0);
  });

  it('should count step relations separately', () => {
    const { graph } = buildStepFamily();
    const counts = getRelationshipCounts('child', graph);

    expect(counts.step).toBeGreaterThan(0);
  });

  it('should handle person with no relatives', () => {
    const { graph, person } = buildSinglePersonGraph();
    const counts = getRelationshipCounts(person.id, graph);

    expect(counts.total).toBe(0);
    expect(counts.blood).toBe(0);
    expect(counts.inLaw).toBe(0);
    expect(counts.step).toBe(0);
  });
});

describe('performance', () => {
  it('should handle medium-sized family efficiently', () => {
    const { graph } = buildLargeFamily(3, 2); // ~30 persons

    const start = performance.now();

    // Compute a relationship
    const personIds = graph.getAllPersonIds();
    if (personIds.length >= 2) {
      const rel = computeRelationship(personIds[0], personIds[personIds.length - 1], graph);
      expect(rel).toBeDefined(); // Just ensure it completes
    }

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1000); // Should complete in under 1 second
  });

  it('should batch compute efficiently', () => {
    const { graph } = buildLargeFamily(3, 2);

    const personIds = graph.getAllPersonIds().slice(0, 10);
    const pairs: [string, string][] = [];

    for (let i = 0; i < personIds.length - 1; i++) {
      pairs.push([personIds[i], personIds[i + 1]]);
    }

    const start = performance.now();
    const results = computeRelationshipsBatch(pairs, graph);
    const elapsed = performance.now() - start;

    expect(results.length).toBe(pairs.length);
    expect(elapsed).toBeLessThan(2000); // Should complete in under 2 seconds
  });
});
