/**
 * Tests for FamilyGraph class
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FamilyGraph } from '../src/graph.js';
import {
  buildNuclearFamily,
  buildThreeGenerationFamily,
  buildHalfSiblingFamily,
  buildStepFamily,
  buildEmptyGraph,
  buildSinglePersonGraph,
  createPerson,
  createRelationship,
} from './test-helpers.js';

describe('FamilyGraph', () => {
  describe('construction', () => {
    it('should create an empty graph', () => {
      const graph = buildEmptyGraph();
      expect(graph.size).toBe(0);
      expect(graph.getAllPersons()).toHaveLength(0);
    });

    it('should create a graph with a single person', () => {
      const { graph, person } = buildSinglePersonGraph();
      expect(graph.size).toBe(1);
      expect(graph.hasPerson(person.id)).toBe(true);
      expect(graph.getPerson(person.id)).toEqual(person);
    });

    it('should create a nuclear family graph', () => {
      const { graph, persons } = buildNuclearFamily();
      expect(graph.size).toBe(4);

      for (const [id, person] of persons) {
        expect(graph.hasPerson(id)).toBe(true);
        expect(graph.getPerson(id)).toEqual(person);
      }
    });

    it('should handle adding persons individually', () => {
      const graph = new FamilyGraph();
      const person = createPerson('p1', 'John', 'Doe', 'MALE');

      graph.addPerson(person);

      expect(graph.size).toBe(1);
      expect(graph.getPerson('p1')).toEqual(person);
    });

    it('should handle adding relationships', () => {
      const graph = new FamilyGraph();
      const father = createPerson('father', 'John', 'Doe', 'MALE');
      const child = createPerson('child', 'Alice', 'Doe', 'FEMALE');

      graph.addPerson(father);
      graph.addPerson(child);
      graph.addRelationship(createRelationship('r1', 'father', 'child', 'PARENT'));

      expect(graph.isParentOf('father', 'child')).toBe(true);
      expect(graph.isChildOf('child', 'father')).toBe(true);
    });
  });

  describe('getParents', () => {
    it('should return empty array for person with no parents', () => {
      const { graph } = buildNuclearFamily();
      const parents = graph.getParents('father');
      expect(parents).toHaveLength(0);
    });

    it('should return both parents for a child', () => {
      const { graph } = buildNuclearFamily();
      const parents = graph.getParents('child1');

      expect(parents).toHaveLength(2);
      const parentIds = parents.map(p => p.person.id);
      expect(parentIds).toContain('father');
      expect(parentIds).toContain('mother');
    });

    it('should return parent IDs efficiently', () => {
      const { graph } = buildNuclearFamily();
      const parentIds = graph.getParentIds('child1');

      expect(parentIds).toHaveLength(2);
      expect(parentIds).toContain('father');
      expect(parentIds).toContain('mother');
    });

    it('should distinguish biological from step parents', () => {
      const { graph } = buildStepFamily();
      const parents = graph.getParents('child');

      expect(parents).toHaveLength(2);

      const bioParent = parents.find(p => !p.metadata.isStep);
      const stepParent = parents.find(p => p.metadata.isStep);

      expect(bioParent?.person.id).toBe('father');
      expect(stepParent?.person.id).toBe('stepmother');
    });

    it('should return only biological parents when requested', () => {
      const { graph } = buildStepFamily();
      const bioParents = graph.getBiologicalParents('child');

      expect(bioParents).toHaveLength(1);
      expect(bioParents[0].id).toBe('father');
    });
  });

  describe('getChildren', () => {
    it('should return empty array for person with no children', () => {
      const { graph } = buildNuclearFamily();
      const children = graph.getChildren('child1');
      expect(children).toHaveLength(0);
    });

    it('should return all children of a parent', () => {
      const { graph } = buildNuclearFamily();
      const children = graph.getChildren('father');

      expect(children).toHaveLength(2);
      const childIds = children.map(c => c.person.id);
      expect(childIds).toContain('child1');
      expect(childIds).toContain('child2');
    });

    it('should return child IDs efficiently', () => {
      const { graph } = buildNuclearFamily();
      const childIds = graph.getChildIds('mother');

      expect(childIds).toHaveLength(2);
      expect(childIds).toContain('child1');
      expect(childIds).toContain('child2');
    });
  });

  describe('getSpouses', () => {
    it('should return empty array for unmarried person', () => {
      const { graph } = buildNuclearFamily();
      const spouses = graph.getSpouses('child1');
      expect(spouses).toHaveLength(0);
    });

    it('should return spouse for married person', () => {
      const { graph } = buildNuclearFamily();
      const spouses = graph.getSpouses('father');

      expect(spouses).toHaveLength(1);
      expect(spouses[0].person.id).toBe('mother');
    });

    it('should be bidirectional', () => {
      const { graph } = buildNuclearFamily();

      expect(graph.areSpouses('father', 'mother')).toBe(true);
      expect(graph.areSpouses('mother', 'father')).toBe(true);
    });

    it('should return spouse IDs efficiently', () => {
      const { graph } = buildNuclearFamily();
      const spouseIds = graph.getSpouseIds('father');

      expect(spouseIds).toHaveLength(1);
      expect(spouseIds[0]).toBe('mother');
    });
  });

  describe('getSiblings', () => {
    it('should return full siblings', () => {
      const { graph } = buildNuclearFamily();
      const siblings = graph.getSiblings('child1');

      expect(siblings).toHaveLength(1);
      expect(siblings[0].person.id).toBe('child2');
      expect(siblings[0].siblingType).toBe('full');
    });

    it('should identify half-siblings', () => {
      const { graph } = buildHalfSiblingFamily();

      // child1 and child2 share only mother - half siblings
      const siblings1 = graph.getSiblings('child1');
      const child2Sibling = siblings1.find(s => s.person.id === 'child2');

      expect(child2Sibling).toBeDefined();
      expect(child2Sibling?.siblingType).toBe('half');
    });

    it('should identify step-siblings', () => {
      const { graph } = buildStepFamily();
      const siblings = graph.getSiblings('child');

      expect(siblings).toHaveLength(1);
      expect(siblings[0].person.id).toBe('stepchild');
      expect(siblings[0].siblingType).toBe('step');
    });

    it('should be bidirectional', () => {
      const { graph } = buildNuclearFamily();

      expect(graph.areSiblings('child1', 'child2')).toBe(true);
      expect(graph.areSiblings('child2', 'child1')).toBe(true);
    });

    it('should include shared parent IDs', () => {
      const { graph } = buildNuclearFamily();
      const siblings = graph.getSiblings('child1');

      expect(siblings[0].sharedParentIds).toContain('father');
      expect(siblings[0].sharedParentIds).toContain('mother');
    });
  });

  describe('relationship checks', () => {
    it('should check parent-child relationships', () => {
      const { graph } = buildNuclearFamily();

      expect(graph.isParentOf('father', 'child1')).toBe(true);
      expect(graph.isParentOf('child1', 'father')).toBe(false);
      expect(graph.isChildOf('child1', 'father')).toBe(true);
      expect(graph.isChildOf('father', 'child1')).toBe(false);
    });

    it('should check spouse relationships', () => {
      const { graph } = buildNuclearFamily();

      expect(graph.areSpouses('father', 'mother')).toBe(true);
      expect(graph.areSpouses('father', 'child1')).toBe(false);
    });

    it('should check sibling relationships', () => {
      const { graph } = buildNuclearFamily();

      expect(graph.areSiblings('child1', 'child2')).toBe(true);
      expect(graph.areSiblings('child1', 'father')).toBe(false);
    });
  });

  describe('getDirectRelationship', () => {
    it('should return metadata for parent-child relationship', () => {
      const { graph } = buildNuclearFamily();

      const metadata = graph.getDirectRelationship('father', 'child1');
      expect(metadata).not.toBeNull();
      expect(metadata?.relationshipType).toBe('PARENT');
    });

    it('should return metadata for spouse relationship', () => {
      const { graph } = buildNuclearFamily();

      const metadata = graph.getDirectRelationship('father', 'mother');
      expect(metadata).not.toBeNull();
      expect(metadata?.relationshipType).toBe('SPOUSE');
    });

    it('should return null for unrelated persons', () => {
      const { graph } = buildNuclearFamily();

      const metadata = graph.getDirectRelationship('child1', 'child2');
      // Children don't have a direct stored relationship (computed as siblings)
      expect(metadata).toBeNull();
    });
  });

  describe('getAllConnections', () => {
    it('should return all connections for a person', () => {
      const { graph } = buildNuclearFamily();

      const fatherConnections = graph.getAllConnections('father');
      expect(fatherConnections.length).toBeGreaterThanOrEqual(3); // spouse + 2 children

      const connectionTypes = fatherConnections.map(c => c.connectionType);
      expect(connectionTypes).toContain('spouse');
      expect(connectionTypes).toContain('child');
    });

    it('should return parent connections', () => {
      const { graph } = buildNuclearFamily();

      const childConnections = graph.getAllConnections('child1');
      const parentConnections = childConnections.filter(c => c.connectionType === 'parent');

      expect(parentConnections).toHaveLength(2);
    });
  });

  describe('getAllPersonIds', () => {
    it('should return all person IDs', () => {
      const { graph, persons } = buildNuclearFamily();

      const ids = graph.getAllPersonIds();
      expect(ids).toHaveLength(persons.size);

      for (const id of persons.keys()) {
        expect(ids).toContain(id);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle person not in graph', () => {
      const graph = buildEmptyGraph();

      expect(graph.getPerson('nonexistent')).toBeUndefined();
      expect(graph.hasPerson('nonexistent')).toBe(false);
      expect(graph.getParents('nonexistent')).toHaveLength(0);
      expect(graph.getChildren('nonexistent')).toHaveLength(0);
    });

    it('should handle relationships with missing persons gracefully', () => {
      const graph = new FamilyGraph();
      // Add relationship without adding persons first
      graph.addRelationship(createRelationship('r1', 'p1', 'p2', 'PARENT'));

      // Should have created adjacency entries even though persons don't exist
      expect(graph.getParentIds('p2')).toContain('p1');
      expect(graph.getChildIds('p1')).toContain('p2');
    });
  });
});
