/**
 * Tests for RelationshipNamer
 */

import { describe, it, expect } from 'vitest';
import { RelationshipNamer } from '../src/naming.js';

describe('RelationshipNamer', () => {
  describe('nameAncestor', () => {
    it('should name direct parents', () => {
      expect(RelationshipNamer.nameAncestor(1, 'MALE')).toBe('father');
      expect(RelationshipNamer.nameAncestor(1, 'FEMALE')).toBe('mother');
      expect(RelationshipNamer.nameAncestor(1, 'UNKNOWN')).toBe('parent');
      expect(RelationshipNamer.nameAncestor(1)).toBe('parent');
    });

    it('should name grandparents', () => {
      expect(RelationshipNamer.nameAncestor(2, 'MALE')).toBe('grandfather');
      expect(RelationshipNamer.nameAncestor(2, 'FEMALE')).toBe('grandmother');
      expect(RelationshipNamer.nameAncestor(2)).toBe('grandparent');
    });

    it('should name great-grandparents', () => {
      expect(RelationshipNamer.nameAncestor(3, 'MALE')).toBe('great-grandfather');
      expect(RelationshipNamer.nameAncestor(3, 'FEMALE')).toBe('great-grandmother');
      expect(RelationshipNamer.nameAncestor(3)).toBe('great-grandparent');
    });

    it('should name multiple greats', () => {
      expect(RelationshipNamer.nameAncestor(4, 'MALE')).toBe('2x great-grandfather');
      expect(RelationshipNamer.nameAncestor(5, 'FEMALE')).toBe('3x great-grandmother');
      expect(RelationshipNamer.nameAncestor(6)).toBe('4x great-grandparent');
    });

    it('should throw for invalid generations', () => {
      expect(() => RelationshipNamer.nameAncestor(0)).toThrow();
      expect(() => RelationshipNamer.nameAncestor(-1)).toThrow();
    });
  });

  describe('nameDescendant', () => {
    it('should name direct children', () => {
      expect(RelationshipNamer.nameDescendant(1, 'MALE')).toBe('son');
      expect(RelationshipNamer.nameDescendant(1, 'FEMALE')).toBe('daughter');
      expect(RelationshipNamer.nameDescendant(1, 'UNKNOWN')).toBe('child');
      expect(RelationshipNamer.nameDescendant(1)).toBe('child');
    });

    it('should name grandchildren', () => {
      expect(RelationshipNamer.nameDescendant(2, 'MALE')).toBe('grandson');
      expect(RelationshipNamer.nameDescendant(2, 'FEMALE')).toBe('granddaughter');
      expect(RelationshipNamer.nameDescendant(2)).toBe('grandchild');
    });

    it('should name great-grandchildren', () => {
      expect(RelationshipNamer.nameDescendant(3, 'MALE')).toBe('great-grandson');
      expect(RelationshipNamer.nameDescendant(3, 'FEMALE')).toBe('great-granddaughter');
      expect(RelationshipNamer.nameDescendant(3)).toBe('great-grandchild');
    });

    it('should name multiple greats', () => {
      expect(RelationshipNamer.nameDescendant(4, 'MALE')).toBe('2x great-grandson');
      expect(RelationshipNamer.nameDescendant(5, 'FEMALE')).toBe('3x great-granddaughter');
      expect(RelationshipNamer.nameDescendant(6)).toBe('4x great-grandchild');
    });

    it('should throw for invalid generations', () => {
      expect(() => RelationshipNamer.nameDescendant(0)).toThrow();
      expect(() => RelationshipNamer.nameDescendant(-1)).toThrow();
    });
  });

  describe('nameAuntUncle', () => {
    it('should name direct aunt/uncle', () => {
      expect(RelationshipNamer.nameAuntUncle(2, 'MALE')).toBe('uncle');
      expect(RelationshipNamer.nameAuntUncle(2, 'FEMALE')).toBe('aunt');
      expect(RelationshipNamer.nameAuntUncle(2)).toBe('pibling');
    });

    it('should name great-aunt/uncle', () => {
      expect(RelationshipNamer.nameAuntUncle(3, 'MALE')).toBe('great-uncle');
      expect(RelationshipNamer.nameAuntUncle(3, 'FEMALE')).toBe('great-aunt');
      expect(RelationshipNamer.nameAuntUncle(3)).toBe('great-pibling');
    });

    it('should name multiple great aunts/uncles', () => {
      expect(RelationshipNamer.nameAuntUncle(4, 'MALE')).toBe('2x great-uncle');
      expect(RelationshipNamer.nameAuntUncle(5, 'FEMALE')).toBe('3x great-aunt');
    });

    it('should throw for invalid generations', () => {
      expect(() => RelationshipNamer.nameAuntUncle(1)).toThrow();
      expect(() => RelationshipNamer.nameAuntUncle(0)).toThrow();
    });
  });

  describe('nameNephewNiece', () => {
    it('should name direct nephew/niece', () => {
      expect(RelationshipNamer.nameNephewNiece(2, 'MALE')).toBe('nephew');
      expect(RelationshipNamer.nameNephewNiece(2, 'FEMALE')).toBe('niece');
      expect(RelationshipNamer.nameNephewNiece(2)).toBe('nibling');
    });

    it('should name great-nephew/niece', () => {
      expect(RelationshipNamer.nameNephewNiece(3, 'MALE')).toBe('great-nephew');
      expect(RelationshipNamer.nameNephewNiece(3, 'FEMALE')).toBe('great-niece');
      expect(RelationshipNamer.nameNephewNiece(3)).toBe('great-nibling');
    });

    it('should name multiple great nephews/nieces', () => {
      expect(RelationshipNamer.nameNephewNiece(4, 'MALE')).toBe('2x great-nephew');
      expect(RelationshipNamer.nameNephewNiece(5, 'FEMALE')).toBe('3x great-niece');
    });

    it('should throw for invalid generations', () => {
      expect(() => RelationshipNamer.nameNephewNiece(1)).toThrow();
      expect(() => RelationshipNamer.nameNephewNiece(0)).toThrow();
    });
  });

  describe('nameSibling', () => {
    it('should name full siblings', () => {
      expect(RelationshipNamer.nameSibling('MALE', false)).toBe('brother');
      expect(RelationshipNamer.nameSibling('FEMALE', false)).toBe('sister');
      expect(RelationshipNamer.nameSibling('UNKNOWN', false)).toBe('sibling');
      expect(RelationshipNamer.nameSibling(undefined, false)).toBe('sibling');
    });

    it('should name half-siblings', () => {
      expect(RelationshipNamer.nameSibling('MALE', true)).toBe('half-brother');
      expect(RelationshipNamer.nameSibling('FEMALE', true)).toBe('half-sister');
      expect(RelationshipNamer.nameSibling('UNKNOWN', true)).toBe('half-sibling');
    });
  });

  describe('nameCousin', () => {
    it('should name first cousins', () => {
      expect(RelationshipNamer.nameCousin(1, 0)).toBe('1st cousin');
      expect(RelationshipNamer.nameCousin(1)).toBe('1st cousin');
    });

    it('should name second and third cousins', () => {
      expect(RelationshipNamer.nameCousin(2, 0)).toBe('2nd cousin');
      expect(RelationshipNamer.nameCousin(3, 0)).toBe('3rd cousin');
      expect(RelationshipNamer.nameCousin(4, 0)).toBe('4th cousin');
    });

    it('should name cousins with removal', () => {
      expect(RelationshipNamer.nameCousin(1, 1)).toBe('1st cousin once removed');
      expect(RelationshipNamer.nameCousin(1, 2)).toBe('1st cousin twice removed');
      expect(RelationshipNamer.nameCousin(2, 1)).toBe('2nd cousin once removed');
      expect(RelationshipNamer.nameCousin(3, 2)).toBe('3rd cousin twice removed');
    });

    it('should handle many times removed', () => {
      expect(RelationshipNamer.nameCousin(1, 3)).toBe('1st cousin three times removed');
      expect(RelationshipNamer.nameCousin(1, 4)).toBe('1st cousin four times removed');
      expect(RelationshipNamer.nameCousin(1, 5)).toBe('1st cousin five times removed');
    });

    it('should handle high removal numbers', () => {
      expect(RelationshipNamer.nameCousin(1, 11)).toBe('1st cousin 11 times removed');
    });

    it('should handle high cousin degrees', () => {
      expect(RelationshipNamer.nameCousin(21, 0)).toBe('21th cousin');
    });

    it('should throw for invalid degree', () => {
      expect(() => RelationshipNamer.nameCousin(0, 0)).toThrow();
      expect(() => RelationshipNamer.nameCousin(-1, 0)).toThrow();
    });
  });

  describe('nameSpouse', () => {
    it('should name spouses by gender', () => {
      expect(RelationshipNamer.nameSpouse('MALE')).toBe('husband');
      expect(RelationshipNamer.nameSpouse('FEMALE')).toBe('wife');
      expect(RelationshipNamer.nameSpouse('UNKNOWN')).toBe('spouse');
      expect(RelationshipNamer.nameSpouse()).toBe('spouse');
    });
  });

  describe('addQualifiers', () => {
    it('should add half- prefix', () => {
      expect(RelationshipNamer.addQualifiers('brother', { isHalf: true })).toBe('half-brother');
    });

    it('should add step- prefix', () => {
      expect(RelationshipNamer.addQualifiers('mother', { isStep: true })).toBe('step-mother');
    });

    it('should add adoptive prefix', () => {
      expect(RelationshipNamer.addQualifiers('father', { isAdoptive: true })).toBe('adoptive father');
    });

    it('should add foster prefix', () => {
      expect(RelationshipNamer.addQualifiers('child', { isFoster: true })).toBe('foster child');
    });

    it('should add -in-law suffix', () => {
      expect(RelationshipNamer.addQualifiers('brother', { isInLaw: true })).toBe('brother-in-law');
    });

    it('should combine multiple qualifiers', () => {
      expect(RelationshipNamer.addQualifiers('brother', { isHalf: true, isInLaw: true })).toBe('half-brother-in-law');
    });

    it('should not modify without qualifiers', () => {
      expect(RelationshipNamer.addQualifiers('sister', {})).toBe('sister');
    });
  });

  describe('calculateCousinParameters', () => {
    it('should calculate first cousin parameters', () => {
      // First cousins: both 2 generations from grandparents
      const result = RelationshipNamer.calculateCousinParameters(2, 2);
      expect(result.degree).toBe(1);
      expect(result.removal).toBe(0);
    });

    it('should calculate first cousin once removed', () => {
      // Person A is 2 generations from grandparent, person B is 3 generations
      const result = RelationshipNamer.calculateCousinParameters(2, 3);
      expect(result.degree).toBe(1);
      expect(result.removal).toBe(1);
    });

    it('should calculate second cousin', () => {
      // Both 3 generations from great-grandparents
      const result = RelationshipNamer.calculateCousinParameters(3, 3);
      expect(result.degree).toBe(2);
      expect(result.removal).toBe(0);
    });

    it('should calculate second cousin twice removed', () => {
      const result = RelationshipNamer.calculateCousinParameters(3, 5);
      expect(result.degree).toBe(2);
      expect(result.removal).toBe(2);
    });

    it('should be symmetric', () => {
      const result1 = RelationshipNamer.calculateCousinParameters(2, 3);
      const result2 = RelationshipNamer.calculateCousinParameters(3, 2);
      expect(result1.degree).toBe(result2.degree);
      expect(result1.removal).toBe(result2.removal);
    });
  });

  describe('formatForDisplay', () => {
    it('should capitalize first letter', () => {
      expect(RelationshipNamer.formatForDisplay('father')).toBe('Father');
      expect(RelationshipNamer.formatForDisplay('great-grandmother')).toBe('Great-grandmother');
      expect(RelationshipNamer.formatForDisplay('1st cousin')).toBe('1st cousin');
    });
  });

  describe('getRelationshipAliases', () => {
    it('should return aliases for common relationships', () => {
      const fatherAliases = RelationshipNamer.getRelationshipAliases('father');
      expect(fatherAliases).toContain('father');
      expect(fatherAliases).toContain('dad');
      expect(fatherAliases).toContain('papa');

      const motherAliases = RelationshipNamer.getRelationshipAliases('mother');
      expect(motherAliases).toContain('mom');
      expect(motherAliases).toContain('mama');
    });

    it('should return grandparent aliases', () => {
      const aliases = RelationshipNamer.getRelationshipAliases('grandfather');
      expect(aliases).toContain('grandpa');
      expect(aliases).toContain('gramps');
    });

    it('should return original name for unknown relationships', () => {
      const aliases = RelationshipNamer.getRelationshipAliases('2nd cousin');
      expect(aliases).toContain('2nd cousin');
    });
  });

  describe('parseRelationshipQuery', () => {
    it('should parse basic relationship types', () => {
      expect(RelationshipNamer.parseRelationshipQuery('father')?.baseType).toBe('father');
      expect(RelationshipNamer.parseRelationshipQuery('aunt')?.baseType).toBe('aunt');
      expect(RelationshipNamer.parseRelationshipQuery('cousin')).toBeNull(); // "cousin" alone isn't valid
    });

    it('should parse cousin queries', () => {
      const first = RelationshipNamer.parseRelationshipQuery('1st cousin');
      expect(first?.baseType).toBe('cousin');
      expect(first?.degree).toBe(1);
      expect(first?.removal).toBe(0);

      const second = RelationshipNamer.parseRelationshipQuery('2nd cousin');
      expect(second?.degree).toBe(2);
    });

    it('should parse cousins with removal', () => {
      const result = RelationshipNamer.parseRelationshipQuery('1st cousin once removed');
      expect(result?.baseType).toBe('cousin');
      expect(result?.degree).toBe(1);
      expect(result?.removal).toBe(1);

      const twice = RelationshipNamer.parseRelationshipQuery('2nd cousin twice removed');
      expect(twice?.degree).toBe(2);
      expect(twice?.removal).toBe(2);
    });

    it('should parse great- prefix', () => {
      const result = RelationshipNamer.parseRelationshipQuery('great-grandmother');
      expect(result?.baseType).toBe('grandmother');
      expect(result?.greats).toBe(1);

      const multiple = RelationshipNamer.parseRelationshipQuery('2x great-grandfather');
      expect(multiple?.baseType).toBe('grandfather');
      expect(multiple?.greats).toBe(2);
    });

    it('should parse half- prefix', () => {
      const result = RelationshipNamer.parseRelationshipQuery('half-brother');
      expect(result?.baseType).toBe('brother');
      expect(result?.isHalf).toBe(true);
    });

    it('should parse step- prefix', () => {
      const result = RelationshipNamer.parseRelationshipQuery('step-mother');
      expect(result?.baseType).toBe('mother');
      expect(result?.isStep).toBe(true);
    });

    it('should parse -in-law suffix', () => {
      const result = RelationshipNamer.parseRelationshipQuery('mother-in-law');
      expect(result?.baseType).toBe('mother');
      expect(result?.isInLaw).toBe(true);
    });

    it('should return null for invalid queries', () => {
      expect(RelationshipNamer.parseRelationshipQuery('xyz')).toBeNull();
      expect(RelationshipNamer.parseRelationshipQuery('')).toBeNull();
    });
  });
});
