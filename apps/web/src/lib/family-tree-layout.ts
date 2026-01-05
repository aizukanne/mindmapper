/**
 * Family Tree Layout Algorithm
 *
 * Computes positions for family tree visualization:
 * - Vertical hierarchy: oldest generation at top, newest at bottom
 * - Horizontal generation alignment
 * - Spouses positioned side-by-side
 * - Children centered below parents
 * - Automatic collision prevention
 */

import type { Person, Relationship } from '@mindmapper/types';

export interface LayoutNode {
  id: string;
  person: Person;
  x: number;
  y: number;
  width: number;
  height: number;
  generation: number;
  spouseIds: string[];
  parentIds: string[];
  childIds: string[];
  siblingIds: string[];
}

export interface LayoutEdge {
  id: string;
  fromId: string;
  toId: string;
  type: 'parent-child' | 'spouse' | 'sibling';
  points: Array<{ x: number; y: number }>;
}

export interface TreeLayout {
  nodes: Map<string, LayoutNode>;
  edges: LayoutEdge[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  };
  generations: Map<number, string[]>;
}

export interface LayoutOptions {
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  spouseSpacing: number;
  siblingSpacing: number;
  compact: boolean;
}

const DEFAULT_OPTIONS: LayoutOptions = {
  nodeWidth: 180,
  nodeHeight: 100,
  horizontalSpacing: 40,
  verticalSpacing: 120,
  spouseSpacing: 20,
  siblingSpacing: 30,
  compact: false,
};

/**
 * Build relationship maps from flat relationship array
 */
function buildRelationshipMaps(relationships: Relationship[]): {
  parentMap: Map<string, string[]>;
  childMap: Map<string, string[]>;
  spouseMap: Map<string, string[]>;
  siblingMap: Map<string, string[]>;
} {
  const parentMap = new Map<string, string[]>();
  const childMap = new Map<string, string[]>();
  const spouseMap = new Map<string, string[]>();
  const siblingMap = new Map<string, string[]>();

  for (const rel of relationships) {
    const fromId = rel.personFromId;
    const toId = rel.personToId;

    switch (rel.relationshipType) {
      case 'PARENT':
        // fromId is parent of toId
        if (!childMap.has(fromId)) childMap.set(fromId, []);
        childMap.get(fromId)!.push(toId);
        if (!parentMap.has(toId)) parentMap.set(toId, []);
        parentMap.get(toId)!.push(fromId);
        break;

      case 'CHILD':
        // fromId is parent, toId is child
        if (!childMap.has(fromId)) childMap.set(fromId, []);
        childMap.get(fromId)!.push(toId);
        if (!parentMap.has(toId)) parentMap.set(toId, []);
        parentMap.get(toId)!.push(fromId);
        break;

      case 'SPOUSE':
        if (!spouseMap.has(fromId)) spouseMap.set(fromId, []);
        if (!spouseMap.get(fromId)!.includes(toId)) {
          spouseMap.get(fromId)!.push(toId);
        }
        if (!spouseMap.has(toId)) spouseMap.set(toId, []);
        if (!spouseMap.get(toId)!.includes(fromId)) {
          spouseMap.get(toId)!.push(fromId);
        }
        break;

      case 'SIBLING':
        if (!siblingMap.has(fromId)) siblingMap.set(fromId, []);
        if (!siblingMap.get(fromId)!.includes(toId)) {
          siblingMap.get(fromId)!.push(toId);
        }
        if (!siblingMap.has(toId)) siblingMap.set(toId, []);
        if (!siblingMap.get(toId)!.includes(fromId)) {
          siblingMap.get(toId)!.push(fromId);
        }
        break;

      // Handle adoptive, step, foster relationships as parent-child
      case 'ADOPTIVE_PARENT':
      case 'STEP_PARENT':
      case 'FOSTER_PARENT':
      case 'GUARDIAN':
        if (!childMap.has(fromId)) childMap.set(fromId, []);
        childMap.get(fromId)!.push(toId);
        if (!parentMap.has(toId)) parentMap.set(toId, []);
        parentMap.get(toId)!.push(fromId);
        break;

      case 'ADOPTIVE_CHILD':
      case 'STEP_CHILD':
      case 'FOSTER_CHILD':
      case 'WARD':
        // fromId is the parent, toId is the child
        if (!childMap.has(fromId)) childMap.set(fromId, []);
        childMap.get(fromId)!.push(toId);
        if (!parentMap.has(toId)) parentMap.set(toId, []);
        parentMap.get(toId)!.push(fromId);
        break;
    }
  }

  return { parentMap, childMap, spouseMap, siblingMap };
}

/**
 * Compute generation numbers for all people
 * Generation 0 is the root/oldest known generation
 */
function computeGenerations(
  people: Person[],
  parentMap: Map<string, string[]>,
  childMap: Map<string, string[]>
): Map<string, number> {
  const generations = new Map<string, number>();
  const visited = new Set<string>();

  // Find root nodes (people with no parents in the tree)
  const rootIds = people
    .filter(p => !parentMap.has(p.id) || parentMap.get(p.id)!.length === 0)
    .map(p => p.id);

  // BFS from roots to assign generations
  const queue: Array<{ id: string; gen: number }> = rootIds.map(id => ({ id, gen: 0 }));

  while (queue.length > 0) {
    const { id, gen } = queue.shift()!;

    if (visited.has(id)) {
      // Update to lower generation if found through different path
      const existingGen = generations.get(id) ?? gen;
      generations.set(id, Math.min(existingGen, gen));
      continue;
    }

    visited.add(id);
    generations.set(id, gen);

    // Process children
    const children = childMap.get(id) || [];
    for (const childId of children) {
      if (!visited.has(childId)) {
        queue.push({ id: childId, gen: gen + 1 });
      }
    }
  }

  // Handle any disconnected nodes
  for (const person of people) {
    if (!generations.has(person.id)) {
      generations.set(person.id, person.generation ?? 0);
    }
  }

  return generations;
}

/**
 * Group spouse units together for positioning
 */
function buildSpouseUnits(
  people: Person[],
  spouseMap: Map<string, string[]>
): Map<string, string[]> {
  const units = new Map<string, string[]>();
  const assigned = new Set<string>();

  for (const person of people) {
    if (assigned.has(person.id)) continue;

    const spouses = spouseMap.get(person.id) || [];
    const unit = [person.id, ...spouses.filter(s => !assigned.has(s))];

    unit.sort();
    for (const id of unit) {
      units.set(id, unit);
      assigned.add(id);
    }
  }

  return units;
}

/**
 * Position nodes within each generation
 */
function positionNodes(
  people: Person[],
  generations: Map<string, number>,
  parentMap: Map<string, string[]>,
  childMap: Map<string, string[]>,
  spouseMap: Map<string, string[]>,
  siblingMap: Map<string, string[]>,
  options: LayoutOptions
): Map<string, LayoutNode> {
  const nodes = new Map<string, LayoutNode>();
  const spouseUnits = buildSpouseUnits(people, spouseMap);

  // Group people by generation
  const genGroups = new Map<number, Person[]>();
  for (const person of people) {
    const gen = generations.get(person.id) ?? 0;
    if (!genGroups.has(gen)) genGroups.set(gen, []);
    genGroups.get(gen)!.push(person);
  }

  // Sort generations
  const sortedGens = Array.from(genGroups.keys()).sort((a, b) => a - b);

  // Track positioned spouse units
  const positionedUnits = new Set<string>();

  // Position each generation
  for (const gen of sortedGens) {
    const genPeople = genGroups.get(gen) || [];
    const y = gen * (options.nodeHeight + options.verticalSpacing);

    // Group by spouse units and sort by parent positions
    const unitsInGen: Array<{ unit: string[]; parentX: number }> = [];
    const processedInGen = new Set<string>();

    for (const person of genPeople) {
      if (processedInGen.has(person.id)) continue;

      const unit = spouseUnits.get(person.id) || [person.id];
      const unitKey = unit.sort().join('-');

      if (positionedUnits.has(unitKey)) continue;

      // Calculate parent center X for sorting
      const parents = parentMap.get(person.id) || [];
      let parentX = 0;
      if (parents.length > 0) {
        const parentNodes = parents.map(p => nodes.get(p)).filter(Boolean) as LayoutNode[];
        if (parentNodes.length > 0) {
          parentX = parentNodes.reduce((sum, n) => sum + n.x, 0) / parentNodes.length;
        }
      }

      unitsInGen.push({ unit, parentX });
      for (const id of unit) {
        processedInGen.add(id);
      }
      positionedUnits.add(unitKey);
    }

    // Sort units by parent position
    unitsInGen.sort((a, b) => a.parentX - b.parentX);

    // Position units horizontally
    let currentX = 0;
    for (const { unit } of unitsInGen) {
      const unitWidth = unit.length * options.nodeWidth + (unit.length - 1) * options.spouseSpacing;

      // Position each person in the unit
      for (let i = 0; i < unit.length; i++) {
        const personId = unit[i];
        const person = people.find(p => p.id === personId);
        if (!person) continue;

        const x = currentX + i * (options.nodeWidth + options.spouseSpacing);

        nodes.set(personId, {
          id: personId,
          person,
          x,
          y,
          width: options.nodeWidth,
          height: options.nodeHeight,
          generation: gen,
          spouseIds: spouseMap.get(personId) || [],
          parentIds: parentMap.get(personId) || [],
          childIds: childMap.get(personId) || [],
          siblingIds: siblingMap.get(personId) || [],
        });
      }

      currentX += unitWidth + options.horizontalSpacing;
    }
  }

  // Center children under parents
  centerChildrenUnderParents(nodes, childMap, spouseUnits, options);

  return nodes;
}

/**
 * Adjust positions to center children under their parents
 */
function centerChildrenUnderParents(
  nodes: Map<string, LayoutNode>,
  childMap: Map<string, string[]>,
  spouseUnits: Map<string, string[]>,
  options: LayoutOptions
): void {
  // Group nodes by generation
  const genNodes = new Map<number, LayoutNode[]>();
  for (const node of nodes.values()) {
    if (!genNodes.has(node.generation)) genNodes.set(node.generation, []);
    genNodes.get(node.generation)!.push(node);
  }

  // Process from top generation down
  const sortedGens = Array.from(genNodes.keys()).sort((a, b) => a - b);

  for (let i = 0; i < sortedGens.length - 1; i++) {
    const parentGen = sortedGens[i];
    const childGen = sortedGens[i + 1];

    const parentNodes = genNodes.get(parentGen) || [];
    const childNodes = genNodes.get(childGen) || [];

    // For each parent unit, center their children below
    const processedParents = new Set<string>();

    for (const parentNode of parentNodes) {
      if (processedParents.has(parentNode.id)) continue;

      // Get all parents in this spouse unit
      const parentUnit = spouseUnits.get(parentNode.id) || [parentNode.id];
      for (const pid of parentUnit) processedParents.add(pid);

      // Get all children of this parent unit
      const allChildren = new Set<string>();
      for (const pid of parentUnit) {
        const children = childMap.get(pid) || [];
        children.forEach(c => allChildren.add(c));
      }

      if (allChildren.size === 0) continue;

      // Calculate parent unit center
      const parentUnitNodes = parentUnit.map(id => nodes.get(id)).filter(Boolean) as LayoutNode[];

      // Skip if no parent nodes found (filtered out)
      if (parentUnitNodes.length === 0) continue;

      const parentCenterX = parentUnitNodes.reduce((sum, n) => sum + n.x + n.width / 2, 0) / parentUnitNodes.length;

      // Calculate children center
      const childNodesArr = Array.from(allChildren)
        .map(id => nodes.get(id))
        .filter(Boolean) as LayoutNode[];

      if (childNodesArr.length === 0) continue;

      const childMinX = Math.min(...childNodesArr.map(n => n.x));
      const childMaxX = Math.max(...childNodesArr.map(n => n.x + n.width));
      const childCenterX = (childMinX + childMaxX) / 2;

      // Shift children to center under parents
      const shift = parentCenterX - childCenterX;
      for (const childNode of childNodesArr) {
        childNode.x += shift;
      }
    }

    // Resolve overlaps in child generation
    resolveOverlaps(childNodes, options);
  }
}

/**
 * Resolve horizontal overlaps in a generation
 */
function resolveOverlaps(nodes: LayoutNode[], options: LayoutOptions): void {
  if (nodes.length < 2) return;

  // Sort by x position
  nodes.sort((a, b) => a.x - b.x);

  // Push overlapping nodes apart
  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1];
    const curr = nodes[i];
    const minX = prev.x + prev.width + options.horizontalSpacing;

    if (curr.x < minX) {
      curr.x = minX;
    }
  }
}

/**
 * Generate edges between connected nodes
 */
function generateEdges(
  nodes: Map<string, LayoutNode>,
  relationships: Relationship[]
): LayoutEdge[] {
  const edges: LayoutEdge[] = [];
  const processedPairs = new Set<string>();

  for (const rel of relationships) {
    const fromNode = nodes.get(rel.personFromId);
    const toNode = nodes.get(rel.personToId);
    if (!fromNode || !toNode) continue;

    const pairKey = [rel.personFromId, rel.personToId].sort().join('-');
    if (processedPairs.has(pairKey)) continue;
    processedPairs.add(pairKey);

    let type: 'parent-child' | 'spouse' | 'sibling';
    switch (rel.relationshipType) {
      case 'SPOUSE':
        type = 'spouse';
        break;
      case 'SIBLING':
        type = 'sibling';
        break;
      default:
        type = 'parent-child';
    }

    // Calculate connection points
    const points = calculateEdgePoints(fromNode, toNode, type);

    edges.push({
      id: `${rel.personFromId}-${rel.personToId}-${type}`,
      fromId: rel.personFromId,
      toId: rel.personToId,
      type,
      points,
    });
  }

  return edges;
}

/**
 * Calculate points for drawing an edge between two nodes
 */
function calculateEdgePoints(
  from: LayoutNode,
  to: LayoutNode,
  type: 'parent-child' | 'spouse' | 'sibling'
): Array<{ x: number; y: number }> {
  const fromCenterX = from.x + from.width / 2;
  const fromCenterY = from.y + from.height / 2;
  const toCenterX = to.x + to.width / 2;

  if (type === 'spouse') {
    // Horizontal line between spouses
    const y = fromCenterY;
    return [
      { x: from.x + from.width, y },
      { x: to.x, y },
    ];
  }

  if (type === 'sibling') {
    // Arc above siblings
    const y = Math.min(from.y, to.y) - 20;
    return [
      { x: fromCenterX, y: from.y },
      { x: fromCenterX, y },
      { x: toCenterX, y },
      { x: toCenterX, y: to.y },
    ];
  }

  // Parent-child: vertical line with right angles
  const isParentAbove = from.y < to.y;
  const parent = isParentAbove ? from : to;
  const child = isParentAbove ? to : from;

  const parentBottomY = parent.y + parent.height;
  const childTopY = child.y;
  const midY = (parentBottomY + childTopY) / 2;

  return [
    { x: parent.x + parent.width / 2, y: parentBottomY },
    { x: parent.x + parent.width / 2, y: midY },
    { x: child.x + child.width / 2, y: midY },
    { x: child.x + child.width / 2, y: childTopY },
  ];
}

/**
 * Calculate bounding box of the layout
 */
function calculateBounds(nodes: Map<string, LayoutNode>): TreeLayout['bounds'] {
  if (nodes.size === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const node of nodes.values()) {
    // Skip nodes with invalid positions
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) continue;

    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x + node.width);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y + node.height);
  }

  // Fallback to zero bounds if no valid nodes
  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Main layout function
 * Computes positions for all nodes in a family tree
 */
export function computeFamilyTreeLayout(
  people: Person[],
  relationships: Relationship[],
  options: Partial<LayoutOptions> = {}
): TreeLayout {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Build relationship maps
  const { parentMap, childMap, spouseMap, siblingMap } = buildRelationshipMaps(relationships);

  // Compute generations
  const generations = computeGenerations(people, parentMap, childMap);

  // Position nodes
  const nodes = positionNodes(
    people,
    generations,
    parentMap,
    childMap,
    spouseMap,
    siblingMap,
    opts
  );

  // Generate edges
  const edges = generateEdges(nodes, relationships);

  // Calculate bounds
  const bounds = calculateBounds(nodes);

  // Build generation groups
  const genGroups = new Map<number, string[]>();
  for (const [id, gen] of generations) {
    if (!genGroups.has(gen)) genGroups.set(gen, []);
    genGroups.get(gen)!.push(id);
  }

  return {
    nodes,
    edges,
    bounds,
    generations: genGroups,
  };
}

/**
 * Find the center position for a specific person
 */
export function getPersonCenter(layout: TreeLayout, personId: string): { x: number; y: number } | null {
  const node = layout.nodes.get(personId);
  if (!node) return null;

  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  };
}

/**
 * Get all nodes in a specific generation
 */
export function getGenerationNodes(layout: TreeLayout, generation: number): LayoutNode[] {
  const ids = layout.generations.get(generation) || [];
  return ids.map(id => layout.nodes.get(id)).filter(Boolean) as LayoutNode[];
}
