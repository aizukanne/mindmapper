/**
 * Relationship Naming System
 *
 * Converts relationship parameters into human-readable names
 * following standard genealogical terminology.
 */

import type { Gender, RelationshipQualifiers } from './types.js';

/**
 * Ordinal numbers for cousin degrees
 */
const ORDINALS = [
  '', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th',
  '11th', '12th', '13th', '14th', '15th', '16th', '17th', '18th', '19th', '20th',
];

/**
 * Removal words for cousins
 */
const REMOVAL_WORDS = [
  '', 'once', 'twice', 'three times', 'four times', 'five times',
  'six times', 'seven times', 'eight times', 'nine times', 'ten times',
];

/**
 * RelationshipNamer - Static utility class for naming relationships
 */
export class RelationshipNamer {
  /**
   * Name an ancestor relationship.
   *
   * @param generations - Number of generations (1 = parent, 2 = grandparent, etc.)
   * @param gender - Gender of the ancestor
   * @returns Human-readable name like "father", "grandmother", "2x great-grandfather"
   */
  static nameAncestor(generations: number, gender?: Gender): string {
    if (generations < 1) {
      throw new Error('Generations must be at least 1 for ancestors');
    }

    const suffix = this.getParentSuffix(gender);

    if (generations === 1) {
      return suffix; // father, mother, parent
    }

    if (generations === 2) {
      return `grand${suffix}`; // grandfather, grandmother, grandparent
    }

    // 3+ generations: great-grandparent, 2x great-grandparent, etc.
    const greats = generations - 2;
    if (greats === 1) {
      return `great-grand${suffix}`;
    }

    return `${greats}x great-grand${suffix}`;
  }

  /**
   * Name a descendant relationship.
   *
   * @param generations - Number of generations (1 = child, 2 = grandchild, etc.)
   * @param gender - Gender of the descendant
   * @returns Human-readable name like "son", "granddaughter", "3x great-grandson"
   */
  static nameDescendant(generations: number, gender?: Gender): string {
    if (generations < 1) {
      throw new Error('Generations must be at least 1 for descendants');
    }

    const suffix = this.getChildSuffix(gender);

    if (generations === 1) {
      return suffix; // son, daughter, child
    }

    if (generations === 2) {
      return `grand${suffix}`; // grandson, granddaughter, grandchild
    }

    // 3+ generations: great-grandchild, 2x great-grandchild, etc.
    const greats = generations - 2;
    if (greats === 1) {
      return `great-grand${suffix}`;
    }

    return `${greats}x great-grand${suffix}`;
  }

  /**
   * Name an aunt/uncle relationship (parent's sibling or ancestor's sibling).
   *
   * @param generationsUp - Generations up to the common ancestor (2 = aunt/uncle, 3 = great-aunt, etc.)
   * @param gender - Gender of the relative
   * @returns Human-readable name like "aunt", "great-uncle", "2x great-aunt"
   */
  static nameAuntUncle(generationsUp: number, gender?: Gender): string {
    if (generationsUp < 2) {
      throw new Error('Aunt/uncle requires at least 2 generations up');
    }

    const base = this.getPiblingSuffix(gender);

    if (generationsUp === 2) {
      return base; // aunt, uncle
    }

    // 3+ generations up: great-aunt, 2x great-aunt, etc.
    const greats = generationsUp - 2;
    if (greats === 1) {
      return `great-${base}`;
    }

    return `${greats}x great-${base}`;
  }

  /**
   * Name a nephew/niece relationship (sibling's descendant).
   *
   * @param generationsDown - Generations down from sibling (2 = nephew/niece, 3 = great-nephew, etc.)
   * @param gender - Gender of the relative
   * @returns Human-readable name like "nephew", "great-niece", "2x great-nephew"
   */
  static nameNephewNiece(generationsDown: number, gender?: Gender): string {
    if (generationsDown < 2) {
      throw new Error('Nephew/niece requires at least 2 generations in path');
    }

    const base = this.getNiblingSuffix(gender);

    if (generationsDown === 2) {
      return base; // nephew, niece
    }

    // 3+ generations: great-nephew, 2x great-nephew, etc.
    const greats = generationsDown - 2;
    if (greats === 1) {
      return `great-${base}`;
    }

    return `${greats}x great-${base}`;
  }

  /**
   * Name a sibling relationship.
   *
   * @param gender - Gender of the sibling
   * @param isHalf - Whether this is a half-sibling
   * @returns Human-readable name like "brother", "half-sister"
   */
  static nameSibling(gender?: Gender, isHalf: boolean = false): string {
    const base = this.getSiblingSuffix(gender);
    return isHalf ? `half-${base}` : base;
  }

  /**
   * Name a cousin relationship.
   *
   * @param degree - Cousin degree (1 = first cousin, 2 = second cousin, etc.)
   * @param removal - Times removed (generational difference)
   * @returns Human-readable name like "1st cousin", "2nd cousin once removed"
   */
  static nameCousin(degree: number, removal: number = 0): string {
    if (degree < 1) {
      throw new Error('Cousin degree must be at least 1');
    }

    // Get ordinal for degree
    const degreeStr = degree <= 20
      ? ORDINALS[degree]
      : `${degree}th`;

    let name = `${degreeStr} cousin`;

    // Add removal if present
    if (removal > 0) {
      const removalStr = removal <= 10
        ? REMOVAL_WORDS[removal]
        : `${removal} times`;
      name += ` ${removalStr} removed`;
    }

    return name;
  }

  /**
   * Name a spouse relationship.
   *
   * @param gender - Gender of the spouse
   * @returns Human-readable name like "husband", "wife", "spouse"
   */
  static nameSpouse(gender?: Gender): string {
    switch (gender) {
      case 'MALE':
        return 'husband';
      case 'FEMALE':
        return 'wife';
      default:
        return 'spouse';
    }
  }

  /**
   * Add qualifiers to a relationship name.
   *
   * @param baseName - Base relationship name
   * @param qualifiers - Relationship qualifiers to apply
   * @returns Modified name with qualifiers
   */
  static addQualifiers(
    baseName: string,
    qualifiers: Partial<RelationshipQualifiers>
  ): string {
    let result = baseName;

    // Order matters: half, step, adoptive, foster should come before the base name
    // In-law comes after

    if (qualifiers.isHalf) {
      result = `half-${result}`;
    }

    if (qualifiers.isStep) {
      result = `step-${result}`;
    }

    if (qualifiers.isAdoptive) {
      result = `adoptive ${result}`;
    }

    if (qualifiers.isFoster) {
      result = `foster ${result}`;
    }

    if (qualifiers.isInLaw) {
      result = `${result}-in-law`;
    }

    return result;
  }

  /**
   * Calculate cousin degree and removal from generational distances.
   *
   * @param gen1 - Generations from Person A to MRCA
   * @param gen2 - Generations from Person B to MRCA
   * @returns { degree, removal } for cousin relationship
   */
  static calculateCousinParameters(
    gen1: number,
    gen2: number
  ): { degree: number; removal: number } {
    // Cousin degree = min(gen1, gen2) - 1
    // Removal = absolute difference
    const degree = Math.min(gen1, gen2) - 1;
    const removal = Math.abs(gen1 - gen2);

    return { degree, removal };
  }

  /**
   * Get the parent suffix based on gender.
   */
  private static getParentSuffix(gender?: Gender): string {
    switch (gender) {
      case 'MALE':
        return 'father';
      case 'FEMALE':
        return 'mother';
      default:
        return 'parent';
    }
  }

  /**
   * Get the child suffix based on gender.
   */
  private static getChildSuffix(gender?: Gender): string {
    switch (gender) {
      case 'MALE':
        return 'son';
      case 'FEMALE':
        return 'daughter';
      default:
        return 'child';
    }
  }

  /**
   * Get the sibling suffix based on gender.
   */
  private static getSiblingSuffix(gender?: Gender): string {
    switch (gender) {
      case 'MALE':
        return 'brother';
      case 'FEMALE':
        return 'sister';
      default:
        return 'sibling';
    }
  }

  /**
   * Get the pibling (parent's sibling) suffix based on gender.
   */
  private static getPiblingSuffix(gender?: Gender): string {
    switch (gender) {
      case 'MALE':
        return 'uncle';
      case 'FEMALE':
        return 'aunt';
      default:
        return 'pibling'; // Gender-neutral term for aunt/uncle
    }
  }

  /**
   * Get the nibling (sibling's child) suffix based on gender.
   */
  private static getNiblingSuffix(gender?: Gender): string {
    switch (gender) {
      case 'MALE':
        return 'nephew';
      case 'FEMALE':
        return 'niece';
      default:
        return 'nibling'; // Gender-neutral term for nephew/niece
    }
  }

  /**
   * Format a relationship name for display (capitalize first letter).
   */
  static formatForDisplay(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  /**
   * Get all possible relationship names for a given type.
   * Useful for search functionality.
   */
  static getRelationshipAliases(baseName: string): string[] {
    const aliases: string[] = [baseName];

    // Add common variations
    switch (baseName.toLowerCase()) {
      case 'father':
        aliases.push('dad', 'daddy', 'papa', 'pa', 'pop');
        break;
      case 'mother':
        aliases.push('mom', 'mommy', 'mama', 'ma', 'mum');
        break;
      case 'grandfather':
        aliases.push('grandpa', 'granddad', 'gramps', 'grandpop');
        break;
      case 'grandmother':
        aliases.push('grandma', 'granny', 'gran', 'nana', 'nanna');
        break;
      case 'brother':
        aliases.push('bro');
        break;
      case 'sister':
        aliases.push('sis');
        break;
      case 'husband':
        aliases.push('hubby');
        break;
      case 'wife':
        aliases.push('wifey');
        break;
      case 'son':
        aliases.push('boy');
        break;
      case 'daughter':
        aliases.push('girl');
        break;
    }

    return aliases;
  }

  /**
   * Parse a relationship query string to extract parameters.
   * Handles queries like "2nd cousin once removed", "great-grandmother", etc.
   */
  static parseRelationshipQuery(query: string): {
    baseType?: string;
    degree?: number;
    removal?: number;
    greats?: number;
    isHalf?: boolean;
    isStep?: boolean;
    isInLaw?: boolean;
  } | null {
    const normalized = query.toLowerCase().trim();

    // Check for cousin pattern
    const cousinMatch = normalized.match(/^(\d+)(?:st|nd|rd|th)?\s+cousin(?:\s+(\d+|once|twice|three times|four times|five times)\s+(?:times\s+)?removed)?$/);
    if (cousinMatch) {
      let removal = 0;
      if (cousinMatch[2]) {
        const removalStr = cousinMatch[2];
        if (removalStr === 'once') removal = 1;
        else if (removalStr === 'twice') removal = 2;
        else if (removalStr === 'three times') removal = 3;
        else if (removalStr === 'four times') removal = 4;
        else if (removalStr === 'five times') removal = 5;
        else removal = parseInt(removalStr, 10);
      }

      return {
        baseType: 'cousin',
        degree: parseInt(cousinMatch[1], 10),
        removal,
      };
    }

    // Check for great- prefix
    const greatMatch = normalized.match(/^(?:(\d+)x\s+)?great-(.+)$/);
    if (greatMatch) {
      const greats = greatMatch[1] ? parseInt(greatMatch[1], 10) : 1;
      const base = greatMatch[2];

      return {
        baseType: base,
        greats,
      };
    }

    // Check for half-/step- prefix
    const prefixMatch = normalized.match(/^(half-|step-)(.+)$/);
    if (prefixMatch) {
      const result = this.parseRelationshipQuery(prefixMatch[2]);
      if (result) {
        if (prefixMatch[1] === 'half-') result.isHalf = true;
        if (prefixMatch[1] === 'step-') result.isStep = true;
        return result;
      }
    }

    // Check for -in-law suffix
    if (normalized.endsWith('-in-law')) {
      const result = this.parseRelationshipQuery(normalized.replace('-in-law', ''));
      if (result) {
        result.isInLaw = true;
        return result;
      }
    }

    // Basic relationship types
    const basicTypes = [
      'father', 'mother', 'parent',
      'son', 'daughter', 'child',
      'grandfather', 'grandmother', 'grandparent',
      'grandson', 'granddaughter', 'grandchild',
      'brother', 'sister', 'sibling',
      'uncle', 'aunt', 'pibling',
      'nephew', 'niece', 'nibling',
      'husband', 'wife', 'spouse',
    ];

    if (basicTypes.includes(normalized)) {
      return { baseType: normalized };
    }

    return null;
  }
}
