/**
 * Relationship Computation API
 *
 * Client functions for the computed relationship endpoints.
 * These use the @mindmapper/family-graph package on the backend.
 */

import { api } from './api-client';

// =============================================================================
// Types
// =============================================================================

export interface ComputedRelationship {
  fromPersonId: string;
  toPersonId: string;
  type: string;
  displayName: string;
  consanguinity: number;
  generationDifference: number;
  cousinDegree?: number;
  cousinRemoval?: number;
  isBloodRelation: boolean;
  isInLaw: boolean;
  isStep: boolean;
  isHalf: boolean;
  path: Array<{
    from: string;
    to: string;
    relationship: string;
  }>;
  fromPerson?: PersonSummary;
  toPerson?: PersonSummary;
}

export interface PersonSummary {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate?: string;
  profilePhoto?: string;
}

export interface RelationshipResult {
  isRelated: boolean;
  fromPersonId: string;
  toPersonId: string;
  type?: string;
  displayName?: string;
  consanguinity?: number;
  generationDifference?: number;
  cousinDegree?: number;
  cousinRemoval?: number;
  isBloodRelation?: boolean;
  isInLaw?: boolean;
  isStep?: boolean;
  isHalf?: boolean;
  path?: Array<{
    from: string;
    to: string;
    relationship: string;
  }>;
  fromPerson?: PersonSummary;
  toPerson?: PersonSummary;
  message?: string;
}

export interface RelativeWithRelationship {
  person: PersonSummary;
  type: string;
  displayName: string;
  generationDifference: number;
  isBloodRelation: boolean;
  isInLaw: boolean;
  cousinDegree?: number;
  cousinRemoval?: number;
}

export interface ImmediateFamily {
  parents: Array<PersonSummary & { relationshipLabel: string }>;
  children: Array<PersonSummary & { relationshipLabel: string }>;
  spouses: PersonSummary[];
  siblings: Array<PersonSummary & {
    siblingType: 'full' | 'half' | 'step';
    sharedParentIds: string[];
  }>;
}

export interface CommonAncestor {
  ancestorId: string;
  distanceFromA: number;
  distanceFromB: number;
  totalDistance: number;
  ancestor?: PersonSummary;
}

export interface RelationshipPath {
  edges: Array<{
    from: PersonSummary;
    to: PersonSummary;
    relationship: string;
  }>;
  length: number;
}

export interface RelationshipStats {
  totalRelatives: number;
  bloodRelatives: number;
  inLawRelatives: number;
  stepRelatives: number;
  ancestorCount: number;
  descendantCount: number;
  maxGenerationsUp: number;
  maxGenerationsDown: number;
  closestCousinDegree: number | null;
  furthestCousinDegree: number | null;
  relationshipTypeCounts: Record<string, number>;
}

export interface HowRelatedResult {
  persons: PersonSummary[];
  relationships: Array<{
    personA: PersonSummary;
    personB: PersonSummary;
    relationship: ComputedRelationship | null;
    commonAncestors: CommonAncestor[];
  }>;
}

export interface RelativesQuery {
  type?: string;
  degree?: number;
  removal?: number;
  maxGenerations?: number;
  includeInLaws?: boolean;
  limit?: number;
  offset?: number;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get the computed relationship between two people
 */
export async function getComputedRelationship(
  treeId: string,
  personAId: string,
  personBId: string
): Promise<RelationshipResult> {
  return api.get<RelationshipResult>(
    `/api/family-trees/${treeId}/computed/relationship/${personAId}/${personBId}`
  );
}

/**
 * Get all relatives of a person with optional filtering
 */
export async function getRelatives(
  treeId: string,
  personId: string,
  query?: RelativesQuery
): Promise<{
  data: RelativeWithRelationship[];
  meta: { total: number; limit: number; offset: number; hasMore: boolean };
}> {
  const params = new URLSearchParams();
  if (query?.type) params.set('type', query.type);
  if (query?.degree !== undefined) params.set('degree', String(query.degree));
  if (query?.removal !== undefined) params.set('removal', String(query.removal));
  if (query?.maxGenerations !== undefined) params.set('maxGenerations', String(query.maxGenerations));
  if (query?.includeInLaws !== undefined) params.set('includeInLaws', String(query.includeInLaws));
  if (query?.limit !== undefined) params.set('limit', String(query.limit));
  if (query?.offset !== undefined) params.set('offset', String(query.offset));

  const queryString = params.toString();
  const url = `/api/family-trees/${treeId}/computed/people/${personId}/relatives${queryString ? `?${queryString}` : ''}`;

  return api.get(url);
}

/**
 * Get immediate family (parents, children, spouses, siblings)
 */
export async function getImmediateFamily(
  treeId: string,
  personId: string
): Promise<{
  data: ImmediateFamily;
  meta: { counts: { parents: number; children: number; spouses: number; siblings: number } };
}> {
  return api.get(`/api/family-trees/${treeId}/computed/people/${personId}/family`);
}

/**
 * Get all paths connecting two people
 */
export async function getRelationshipPaths(
  treeId: string,
  personAId: string,
  personBId: string
): Promise<{
  data: {
    paths: RelationshipPath[];
    commonAncestors: CommonAncestor[];
  };
  meta: { pathCount: number; commonAncestorCount: number };
}> {
  return api.get(`/api/family-trees/${treeId}/computed/relationship-path/${personAId}/${personBId}`);
}

/**
 * Search for relatives by relationship type
 */
export async function searchRelatives(
  treeId: string,
  fromPersonId: string,
  query: string
): Promise<{
  data: Array<{ person: PersonSummary; relationship: ComputedRelationship }>;
  meta: { query: string; resultCount: number };
}> {
  const params = new URLSearchParams({ fromPersonId, query });
  return api.get(`/api/family-trees/${treeId}/computed/relationship-search?${params}`);
}

/**
 * Get relationships between multiple people
 */
export async function getHowRelated(
  treeId: string,
  personIds: string[]
): Promise<{
  data: HowRelatedResult;
  meta: { personCount: number; pairCount: number };
}> {
  return api.post(`/api/family-trees/${treeId}/computed/how-related`, { personIds });
}

/**
 * Get relationship statistics for a person
 */
export async function getRelationshipStats(
  treeId: string,
  personId: string
): Promise<{
  data: RelationshipStats;
}> {
  return api.get(`/api/family-trees/${treeId}/computed/people/${personId}/relationship-stats`);
}

/**
 * Get common ancestors between two people
 */
export async function getCommonAncestors(
  treeId: string,
  personAId: string,
  personBId: string
): Promise<{
  data: CommonAncestor[];
  meta: { count: number; mrca: CommonAncestor | null };
}> {
  return api.get(`/api/family-trees/${treeId}/computed/common-ancestors/${personAId}/${personBId}`);
}
