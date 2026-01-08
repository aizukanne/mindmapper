/**
 * Connection Path Generators
 *
 * Generates SVG path strings for different connection line styles
 * used in the family tree visualization.
 */

import type { ConnectionLineStyle } from '@/stores/familyTreeStore';

export interface Point {
  x: number;
  y: number;
}

export interface ConnectionPathOptions {
  /** Style of the line */
  style: ConnectionLineStyle;
  /** Type of relationship */
  type: 'parent-child' | 'spouse' | 'sibling';
  /** Curve tension for curved lines (0-1, default 0.5) */
  curveTension?: number;
  /** Corner radius for orthogonal lines */
  cornerRadius?: number;
}

/**
 * Generate an SVG path string for a connection between two points
 */
export function generateConnectionPath(
  from: Point,
  to: Point,
  options: ConnectionPathOptions
): string {
  const { style, type, curveTension = 0.5, cornerRadius = 10 } = options;

  switch (style) {
    case 'straight':
      return generateStraightPath(from, to);
    case 'curved':
      return generateCurvedPath(from, to, type, curveTension);
    case 'orthogonal':
    default:
      return generateOrthogonalPath(from, to, type, cornerRadius);
  }
}

/**
 * Generate a straight line path
 */
function generateStraightPath(from: Point, to: Point): string {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

/**
 * Generate a curved (bezier) path
 */
function generateCurvedPath(
  from: Point,
  to: Point,
  type: 'parent-child' | 'spouse' | 'sibling',
  tension: number
): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (type === 'spouse') {
    // Horizontal curve for spouse connections
    const controlOffset = Math.abs(dx) * tension * 0.3;
    return `M ${from.x} ${from.y} C ${from.x + dx * 0.3} ${from.y - controlOffset}, ${from.x + dx * 0.7} ${to.y - controlOffset}, ${to.x} ${to.y}`;
  }

  if (type === 'sibling') {
    // Arc above siblings
    const midX = (from.x + to.x) / 2;
    const arcHeight = Math.max(30, Math.abs(dx) * 0.2);
    const arcY = Math.min(from.y, to.y) - arcHeight;
    return `M ${from.x} ${from.y} Q ${midX} ${arcY}, ${to.x} ${to.y}`;
  }

  // Parent-child: vertical S-curve
  const controlStrength = Math.abs(dy) * tension;

  return `M ${from.x} ${from.y} C ${from.x} ${from.y + controlStrength}, ${to.x} ${to.y - controlStrength}, ${to.x} ${to.y}`;
}

/**
 * Generate an orthogonal (right-angled) path with optional rounded corners
 */
function generateOrthogonalPath(
  from: Point,
  to: Point,
  type: 'parent-child' | 'spouse' | 'sibling',
  cornerRadius: number
): string {
  if (type === 'spouse') {
    // Simple horizontal line for spouses
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }

  if (type === 'sibling') {
    // Bracket above siblings
    const arcY = Math.min(from.y, to.y) - 30;
    return generateOrthogonalPathWithCorners(
      [from, { x: from.x, y: arcY }, { x: to.x, y: arcY }, to],
      cornerRadius
    );
  }

  // Parent-child: vertical with horizontal step
  const midY = (from.y + to.y) / 2;

  // If vertically aligned, just draw straight down
  if (Math.abs(from.x - to.x) < 5) {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }

  return generateOrthogonalPathWithCorners(
    [from, { x: from.x, y: midY }, { x: to.x, y: midY }, to],
    cornerRadius
  );
}

/**
 * Generate an orthogonal path with rounded corners
 */
function generateOrthogonalPathWithCorners(points: Point[], radius: number): string {
  if (points.length < 2) return '';
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Calculate vectors
    const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
    const v2 = { x: next.x - curr.x, y: next.y - curr.y };

    // Calculate distances
    const d1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const d2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    // Clamp radius to half of shortest segment
    const maxRadius = Math.min(d1 / 2, d2 / 2, radius);

    if (maxRadius < 2) {
      // Too small for a curve, just line to the corner
      path += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    // Normalize vectors
    const u1 = { x: v1.x / d1, y: v1.y / d1 };
    const u2 = { x: v2.x / d2, y: v2.y / d2 };

    // Calculate start and end of arc
    const arcStart = {
      x: curr.x - u1.x * maxRadius,
      y: curr.y - u1.y * maxRadius,
    };
    const arcEnd = {
      x: curr.x + u2.x * maxRadius,
      y: curr.y + u2.y * maxRadius,
    };

    // Line to arc start, then quadratic curve to arc end
    path += ` L ${arcStart.x} ${arcStart.y} Q ${curr.x} ${curr.y}, ${arcEnd.x} ${arcEnd.y}`;
  }

  // Line to final point
  const lastPoint = points[points.length - 1];
  path += ` L ${lastPoint.x} ${lastPoint.y}`;

  return path;
}

/**
 * Calculate edge points between two nodes based on their positions
 * Returns start and end points for the connection line
 */
export function calculateEdgeEndpoints(
  fromNode: { x: number; y: number; width: number; height: number },
  toNode: { x: number; y: number; width: number; height: number },
  type: 'parent-child' | 'spouse' | 'sibling'
): { from: Point; to: Point } {
  const fromCenterX = fromNode.x + fromNode.width / 2;
  const fromCenterY = fromNode.y + fromNode.height / 2;
  const toCenterX = toNode.x + toNode.width / 2;
  const toCenterY = toNode.y + toNode.height / 2;

  if (type === 'spouse') {
    // Connect at the sides (horizontal)
    const fromOnLeft = fromCenterX < toCenterX;
    return {
      from: {
        x: fromOnLeft ? fromNode.x + fromNode.width : fromNode.x,
        y: fromCenterY,
      },
      to: {
        x: fromOnLeft ? toNode.x : toNode.x + toNode.width,
        y: toCenterY,
      },
    };
  }

  if (type === 'sibling') {
    // Connect at the top
    return {
      from: { x: fromCenterX, y: fromNode.y },
      to: { x: toCenterX, y: toNode.y },
    };
  }

  // Parent-child: connect at top/bottom
  const isFromAbove = fromCenterY < toCenterY;
  return {
    from: {
      x: fromCenterX,
      y: isFromAbove ? fromNode.y + fromNode.height : fromNode.y,
    },
    to: {
      x: toCenterX,
      y: isFromAbove ? toNode.y : toNode.y + toNode.height,
    },
  };
}

/**
 * Generate multiple segment path for complex connections
 * (e.g., when routing around obstacles)
 */
export function generateMultiSegmentPath(
  points: Point[],
  options: ConnectionPathOptions
): string {
  if (points.length < 2) return '';

  if (options.style === 'straight') {
    // Just connect all points with straight lines
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  }

  if (options.style === 'curved') {
    // Create a smooth curve through all points using Catmull-Rom
    return generateSmoothCurve(points, options.curveTension ?? 0.5);
  }

  // Orthogonal with rounded corners
  return generateOrthogonalPathWithCorners(points, options.cornerRadius ?? 10);
}

/**
 * Generate a smooth curve through multiple points using Catmull-Rom interpolation
 */
function generateSmoothCurve(points: Point[], tension: number): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    // For two points, just use a simple curve
    const dx = points[1].x - points[0].x;
    const dy = points[1].y - points[0].y;
    const cx = dx * tension;
    const cy = dy * tension;
    return `M ${points[0].x} ${points[0].y} C ${points[0].x + cx} ${points[0].y + cy}, ${points[1].x - cx} ${points[1].y - cy}, ${points[1].x} ${points[1].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Catmull-Rom to Bezier conversion
    const cp1x = p1.x + (p2.x - p0.x) * tension / 6;
    const cp1y = p1.y + (p2.y - p0.y) * tension / 6;
    const cp2x = p2.x - (p3.x - p1.x) * tension / 6;
    const cp2y = p2.y - (p3.y - p1.y) * tension / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}
