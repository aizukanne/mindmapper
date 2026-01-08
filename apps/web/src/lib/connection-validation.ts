/**
 * Connection Validation Utilities for React Flow Mind Maps
 *
 * This module provides validation logic for node connections including:
 * - Circular reference prevention
 * - Self-connection prevention
 * - Duplicate edge prevention
 * - Node type-based connection rules
 */

import type { Edge, Connection } from '@xyflow/react';
import type { MindMapNode } from '@/stores/mapStore';

export interface ConnectionValidationResult {
  isValid: boolean;
  reason?: string;
}

export interface ConnectionRules {
  allowSelfConnection: boolean;
  allowDuplicateEdges: boolean;
  allowCircularReferences: boolean;
  maxConnectionsPerNode?: number;
  nodeTypeRules?: NodeTypeConnectionRules;
}

export interface NodeTypeConnectionRules {
  // Which node types can be sources (outgoing connections)
  allowedSources: ('ROOT' | 'CHILD' | 'FLOATING')[];
  // Which node types can be targets (incoming connections)
  allowedTargets: ('ROOT' | 'CHILD' | 'FLOATING')[];
  // Specific rules for type combinations
  typeRestrictions?: {
    [sourceType: string]: ('ROOT' | 'CHILD' | 'FLOATING')[];
  };
}

// Default connection rules for mind maps
export const DEFAULT_CONNECTION_RULES: ConnectionRules = {
  allowSelfConnection: false,
  allowDuplicateEdges: false,
  allowCircularReferences: false,
  nodeTypeRules: {
    // ROOT, CHILD, and FLOATING can all be sources
    allowedSources: ['ROOT', 'CHILD', 'FLOATING'],
    // Only CHILD and FLOATING can receive connections (not ROOT)
    allowedTargets: ['CHILD', 'FLOATING'],
    // ROOT nodes can connect to CHILD and FLOATING only
    typeRestrictions: {
      'ROOT': ['CHILD', 'FLOATING'],
      'CHILD': ['CHILD', 'FLOATING'],
      'FLOATING': ['CHILD', 'FLOATING'],
    },
  },
};

/**
 * Check if a connection would create a self-loop
 */
export function isSelfConnection(connection: Connection): boolean {
  return connection.source === connection.target;
}

/**
 * Check if an edge already exists between source and target
 */
export function isDuplicateEdge(
  connection: Connection,
  edges: Edge[]
): boolean {
  return edges.some(
    (edge) =>
      edge.source === connection.source && edge.target === connection.target
  );
}

/**
 * Check if adding this connection would create a circular reference
 * Uses BFS to detect if target can reach source through existing edges
 */
export function wouldCreateCircularReference(
  connection: Connection,
  edges: Edge[]
): boolean {
  if (!connection.source || !connection.target) {
    return false;
  }

  // BFS from target to see if we can reach source
  const visited = new Set<string>();
  const queue: string[] = [connection.target];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === connection.source) {
      return true; // Found circular reference
    }

    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    // Find all nodes that current node connects to (outgoing edges)
    const outgoingEdges = edges.filter((edge) => edge.source === current);
    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        queue.push(edge.target);
      }
    }
  }

  return false;
}

/**
 * Get the path that would create a circular reference (for error messages)
 */
export function getCircularPath(
  connection: Connection,
  edges: Edge[]
): string[] | null {
  if (!connection.source || !connection.target) {
    return null;
  }

  // BFS with path tracking
  const visited = new Set<string>();
  const queue: { nodeId: string; path: string[] }[] = [
    { nodeId: connection.target, path: [connection.target] },
  ];

  while (queue.length > 0) {
    const { nodeId, path } = queue.shift()!;

    if (nodeId === connection.source) {
      return [...path, connection.source]; // Return the circular path
    }

    if (visited.has(nodeId)) {
      continue;
    }
    visited.add(nodeId);

    const outgoingEdges = edges.filter((edge) => edge.source === nodeId);
    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        queue.push({
          nodeId: edge.target,
          path: [...path, edge.target],
        });
      }
    }
  }

  return null;
}

/**
 * Check if connection count exceeds maximum for a node
 */
export function exceedsMaxConnections(
  nodeId: string,
  edges: Edge[],
  maxConnections: number,
  countType: 'source' | 'target' | 'both' = 'both'
): boolean {
  let count = 0;

  if (countType === 'source' || countType === 'both') {
    count += edges.filter((edge) => edge.source === nodeId).length;
  }
  if (countType === 'target' || countType === 'both') {
    count += edges.filter((edge) => edge.target === nodeId).length;
  }

  return count >= maxConnections;
}

/**
 * Validate node type restrictions for a connection
 */
export function validateNodeTypes(
  connection: Connection,
  nodes: MindMapNode[],
  rules: NodeTypeConnectionRules
): ConnectionValidationResult {
  const sourceNode = nodes.find((n) => n.id === connection.source);
  const targetNode = nodes.find((n) => n.id === connection.target);

  if (!sourceNode || !targetNode) {
    return { isValid: false, reason: 'Source or target node not found' };
  }

  const sourceType = sourceNode.data.type;
  const targetType = targetNode.data.type;

  // Check if source type is allowed to create connections
  if (!rules.allowedSources.includes(sourceType)) {
    return {
      isValid: false,
      reason: `${sourceType} nodes cannot create outgoing connections`,
    };
  }

  // Check if target type can receive connections
  if (!rules.allowedTargets.includes(targetType)) {
    return {
      isValid: false,
      reason: `${targetType} nodes cannot receive incoming connections`,
    };
  }

  // Check specific type restrictions
  if (rules.typeRestrictions) {
    const allowedTargetTypes = rules.typeRestrictions[sourceType];
    if (allowedTargetTypes && !allowedTargetTypes.includes(targetType)) {
      return {
        isValid: false,
        reason: `${sourceType} nodes cannot connect to ${targetType} nodes`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Main validation function - validates a connection against all rules
 */
export function validateConnection(
  connection: Connection,
  nodes: MindMapNode[],
  edges: Edge[],
  rules: ConnectionRules = DEFAULT_CONNECTION_RULES
): ConnectionValidationResult {
  // Validate connection has required fields
  if (!connection.source || !connection.target) {
    return { isValid: false, reason: 'Invalid connection: missing source or target' };
  }

  // Check self-connection
  if (!rules.allowSelfConnection && isSelfConnection(connection)) {
    return { isValid: false, reason: 'Self-connections are not allowed' };
  }

  // Check duplicate edges
  if (!rules.allowDuplicateEdges && isDuplicateEdge(connection, edges)) {
    return { isValid: false, reason: 'A connection already exists between these nodes' };
  }

  // Check circular references
  if (!rules.allowCircularReferences && wouldCreateCircularReference(connection, edges)) {
    const path = getCircularPath(connection, edges);
    const pathStr = path ? path.join(' -> ') : 'unknown path';
    return {
      isValid: false,
      reason: `This connection would create a circular reference: ${pathStr}`,
    };
  }

  // Check node type rules
  if (rules.nodeTypeRules) {
    const typeValidation = validateNodeTypes(connection, nodes, rules.nodeTypeRules);
    if (!typeValidation.isValid) {
      return typeValidation;
    }
  }

  // Check max connections per node
  if (rules.maxConnectionsPerNode !== undefined) {
    if (
      exceedsMaxConnections(
        connection.source,
        edges,
        rules.maxConnectionsPerNode,
        'source'
      )
    ) {
      return {
        isValid: false,
        reason: `Source node has reached maximum number of connections (${rules.maxConnectionsPerNode})`,
      };
    }
    if (
      exceedsMaxConnections(
        connection.target,
        edges,
        rules.maxConnectionsPerNode,
        'target'
      )
    ) {
      return {
        isValid: false,
        reason: `Target node has reached maximum number of connections (${rules.maxConnectionsPerNode})`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Get all ancestors of a node (nodes that can reach this node)
 */
export function getAncestors(nodeId: string, edges: Edge[]): Set<string> {
  const ancestors = new Set<string>();
  const visited = new Set<string>();
  const queue: string[] = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    // Find all nodes that have edges pointing to current (parents/ancestors)
    const incomingEdges = edges.filter((edge) => edge.target === current);
    for (const edge of incomingEdges) {
      if (!ancestors.has(edge.source)) {
        ancestors.add(edge.source);
        queue.push(edge.source);
      }
    }
  }

  return ancestors;
}

/**
 * Get all descendants of a node (nodes reachable from this node)
 */
export function getDescendants(nodeId: string, edges: Edge[]): Set<string> {
  const descendants = new Set<string>();
  const visited = new Set<string>();
  const queue: string[] = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    // Find all nodes that current has edges to (children/descendants)
    const outgoingEdges = edges.filter((edge) => edge.source === current);
    for (const edge of outgoingEdges) {
      if (!descendants.has(edge.target)) {
        descendants.add(edge.target);
        queue.push(edge.target);
      }
    }
  }

  return descendants;
}
