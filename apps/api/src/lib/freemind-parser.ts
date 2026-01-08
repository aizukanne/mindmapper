/**
 * FreeMind XML Parser
 *
 * Parses FreeMind (.mm) files into a structured format suitable for importing
 * into the MindMapper application.
 *
 * FreeMind XML Structure:
 * - Root element: <map version="...">
 * - Nodes: <node TEXT="..." [attributes]>
 * - Edges: <edge style="..." color="..." width="..."/>
 * - Fonts: <font NAME="..." SIZE="..." BOLD="..." ITALIC="..."/>
 * - Icons: <icon BUILTIN="..."/>
 * - Clouds: <cloud COLOR="..."/>
 * - Arrow links: <arrowlink DESTINATION="..." [style attributes]/>
 */

import type { NodeStyle, ConnectionStyle } from '@mindmapper/types';

// FreeMind-specific types
export interface FreeMindNodeStyle {
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  edgeColor?: string;
  edgeStyle?: string;
  edgeWidth?: number;
  hasCloud?: boolean;
  cloudColor?: string;
  icons?: string[];
  shape?: 'fork' | 'bubble' | 'rectangle';
}

export interface FreeMindNode {
  id: string;
  text: string;
  position?: 'left' | 'right';
  folded?: boolean;
  link?: string;
  style: FreeMindNodeStyle;
  children: FreeMindNode[];
}

export interface FreeMindArrowLink {
  id: string;
  sourceNodeId: string;
  destinationNodeId: string;
  color?: string;
  startArrow?: string;
  endArrow?: string;
  startInclination?: string;
  endInclination?: string;
}

export interface FreeMindParseWarning {
  type: 'warning';
  message: string;
  context?: string;
  line?: number;
}

export interface FreeMindParseError {
  type: 'error';
  message: string;
  context?: string;
  line?: number;
  fatal: boolean;
}

export interface FreeMindParseResult {
  title: string;
  version?: string;
  rootNode: FreeMindNode | null;
  arrowLinks: FreeMindArrowLink[];
  warnings: FreeMindParseWarning[];
  errors: FreeMindParseError[];
  stats: {
    totalNodes: number;
    totalArrowLinks: number;
    maxDepth: number;
    parseTimeMs: number;
  };
}

// Conversion result for MindMapper format
export interface MindMapperNode {
  id: string;
  text: string;
  type: 'ROOT' | 'CHILD' | 'FLOATING';
  parentId: string | null;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: Partial<NodeStyle>;
  metadata: Record<string, unknown>;
  isCollapsed: boolean;
  sortOrder: number;
}

export interface MindMapperConnection {
  sourceNodeId: string;
  targetNodeId: string;
  type: 'HIERARCHICAL' | 'CROSS_LINK';
  label?: string | null;
  style: Partial<ConnectionStyle>;
}

export interface FreeMindConversionResult {
  title: string;
  nodes: MindMapperNode[];
  connections: MindMapperConnection[];
  warnings: FreeMindParseWarning[];
  errors: FreeMindParseError[];
}

// ID generation helper
let idCounter = 0;
function generateId(): string {
  return `fm-${Date.now().toString(36)}-${(idCounter++).toString(36)}-${Math.random().toString(36).substr(2, 6)}`;
}

// Reset ID counter for testing
export function resetIdCounter(): void {
  idCounter = 0;
}

/**
 * Decode HTML entities in text
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

/**
 * Parse a color value from FreeMind format
 * FreeMind uses #RRGGBB format
 */
function parseColor(color: string | undefined): string | undefined {
  if (!color) return undefined;

  // Normalize color format
  const trimmed = color.trim();
  if (trimmed.startsWith('#')) {
    // Validate hex color
    if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
      return trimmed.toLowerCase();
    }
    if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
      // Expand 3-digit hex to 6-digit
      const r = trimmed[1];
      const g = trimmed[2];
      const b = trimmed[3];
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
  }

  return trimmed;
}

/**
 * Parse font size from string
 */
function parseFontSize(size: string | undefined): number | undefined {
  if (!size) return undefined;
  const parsed = parseInt(size, 10);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Parse boolean attribute (FreeMind uses "true"/"false" strings)
 */
function parseBoolean(value: string | undefined): boolean {
  return value?.toLowerCase() === 'true';
}

/**
 * Parse edge width from FreeMind format
 * FreeMind uses "thin", "1", "2", etc.
 */
function parseEdgeWidth(width: string | undefined): number | undefined {
  if (!width) return undefined;
  if (width === 'thin') return 1;
  if (width === 'parent') return undefined;
  const parsed = parseInt(width, 10);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Extract an attribute value from an XML tag string
 */
function extractAttribute(tagString: string, attrName: string): string | undefined {
  // Match attribute with double quotes
  const doubleQuoteRegex = new RegExp(`${attrName}\\s*=\\s*"([^"]*)"`, 'i');
  const doubleMatch = tagString.match(doubleQuoteRegex);
  if (doubleMatch) {
    return decodeHtmlEntities(doubleMatch[1]);
  }

  // Match attribute with single quotes
  const singleQuoteRegex = new RegExp(`${attrName}\\s*=\\s*'([^']*)'`, 'i');
  const singleMatch = tagString.match(singleQuoteRegex);
  if (singleMatch) {
    return decodeHtmlEntities(singleMatch[1]);
  }

  return undefined;
}

/**
 * Parse a <font> element and extract styling
 */
function parseFontElement(fontTag: string): Partial<FreeMindNodeStyle> {
  const style: Partial<FreeMindNodeStyle> = {};

  const name = extractAttribute(fontTag, 'NAME');
  if (name) style.fontFamily = name;

  const size = extractAttribute(fontTag, 'SIZE');
  if (size) style.fontSize = parseFontSize(size);

  const bold = extractAttribute(fontTag, 'BOLD');
  if (parseBoolean(bold)) style.fontWeight = 'bold';

  const italic = extractAttribute(fontTag, 'ITALIC');
  if (parseBoolean(italic)) style.fontStyle = 'italic';

  return style;
}

/**
 * Parse an <edge> element and extract styling
 */
function parseEdgeElement(edgeTag: string): Partial<FreeMindNodeStyle> {
  const style: Partial<FreeMindNodeStyle> = {};

  const color = extractAttribute(edgeTag, 'COLOR');
  if (color) style.edgeColor = parseColor(color);

  const edgeStyle = extractAttribute(edgeTag, 'STYLE');
  if (edgeStyle) style.edgeStyle = edgeStyle;

  const width = extractAttribute(edgeTag, 'WIDTH');
  if (width) style.edgeWidth = parseEdgeWidth(width);

  return style;
}

/**
 * Parse a <cloud> element
 */
function parseCloudElement(cloudTag: string): Partial<FreeMindNodeStyle> {
  const style: Partial<FreeMindNodeStyle> = {};
  style.hasCloud = true;

  const color = extractAttribute(cloudTag, 'COLOR');
  if (color) style.cloudColor = parseColor(color);

  return style;
}

/**
 * Parse an <icon> element
 */
function parseIconElement(iconTag: string): string | undefined {
  return extractAttribute(iconTag, 'BUILTIN');
}

/**
 * Parse an <arrowlink> element
 */
function parseArrowLinkElement(arrowTag: string, sourceNodeId: string): FreeMindArrowLink | null {
  const destination = extractAttribute(arrowTag, 'DESTINATION');
  if (!destination) return null;

  return {
    id: generateId(),
    sourceNodeId,
    destinationNodeId: destination,
    color: parseColor(extractAttribute(arrowTag, 'COLOR')),
    startArrow: extractAttribute(arrowTag, 'STARTARROW'),
    endArrow: extractAttribute(arrowTag, 'ENDARROW'),
    startInclination: extractAttribute(arrowTag, 'STARTINCLINATION'),
    endInclination: extractAttribute(arrowTag, 'ENDINCLINATION'),
  };
}

/**
 * Find matching close tag position
 */
function findCloseTagPosition(content: string, tagName: string, startPos: number): number {
  let depth = 1;
  let pos = startPos;

  const openPattern = new RegExp(`<${tagName}(?:\\s|>)`, 'gi');
  const closePattern = new RegExp(`</${tagName}>`, 'gi');

  while (pos < content.length && depth > 0) {
    openPattern.lastIndex = pos;
    closePattern.lastIndex = pos;

    const openMatch = openPattern.exec(content);
    const closeMatch = closePattern.exec(content);

    if (!closeMatch) break;

    if (openMatch && openMatch.index < closeMatch.index) {
      // Check if it's a self-closing tag
      const tagEnd = content.indexOf('>', openMatch.index);
      if (tagEnd !== -1 && content[tagEnd - 1] !== '/') {
        depth++;
      }
      pos = openMatch.index + openMatch[0].length;
    } else {
      depth--;
      pos = closeMatch.index + closeMatch[0].length;
      if (depth === 0) {
        return closeMatch.index;
      }
    }
  }

  return -1;
}

/**
 * Parse a single node and its children recursively
 */
function parseNodeElement(
  content: string,
  arrowLinks: FreeMindArrowLink[],
  warnings: FreeMindParseWarning[],
  depth: number = 0
): FreeMindNode | null {
  // Extract the opening tag
  const openTagMatch = content.match(/^<node([^>]*?)(\/>|>)/i);
  if (!openTagMatch) return null;

  const tagAttributes = openTagMatch[1];
  const isSelfClosing = openTagMatch[2] === '/>';

  // Extract node attributes
  const id = extractAttribute(tagAttributes, 'ID') || generateId();
  const text = extractAttribute(tagAttributes, 'TEXT') || '';
  const position = extractAttribute(tagAttributes, 'POSITION') as 'left' | 'right' | undefined;
  const folded = parseBoolean(extractAttribute(tagAttributes, 'FOLDED'));
  const link = extractAttribute(tagAttributes, 'LINK');
  const backgroundColor = parseColor(extractAttribute(tagAttributes, 'BACKGROUND_COLOR'));
  const textColor = parseColor(extractAttribute(tagAttributes, 'COLOR'));
  const style = extractAttribute(tagAttributes, 'STYLE');

  const node: FreeMindNode = {
    id,
    text,
    position,
    folded: folded || undefined,
    link: link || undefined,
    style: {
      backgroundColor,
      textColor,
      shape: style === 'bubble' ? 'bubble' : style === 'fork' ? 'fork' : undefined,
    },
    children: [],
  };

  if (isSelfClosing) {
    return node;
  }

  // Find the content between opening and closing tags
  const openTagEnd = openTagMatch[0].length;
  const closeTagPos = findCloseTagPosition(content, 'node', openTagEnd);

  if (closeTagPos === -1) {
    warnings.push({
      type: 'warning',
      message: `Unclosed node tag for node: ${text.substring(0, 30)}...`,
      context: content.substring(0, 100),
    });
    return node;
  }

  const innerContent = content.substring(openTagEnd, closeTagPos);

  // Parse child elements
  // Font elements
  const fontMatches = innerContent.matchAll(/<font([^>]*?)\/?>/gi);
  for (const match of fontMatches) {
    const fontStyle = parseFontElement(match[0]);
    Object.assign(node.style, fontStyle);
  }

  // Edge elements
  const edgeMatches = innerContent.matchAll(/<edge([^>]*?)\/?>/gi);
  for (const match of edgeMatches) {
    const edgeStyle = parseEdgeElement(match[0]);
    Object.assign(node.style, edgeStyle);
  }

  // Cloud elements
  const cloudMatches = innerContent.matchAll(/<cloud([^>]*?)\/?>/gi);
  for (const match of cloudMatches) {
    const cloudStyle = parseCloudElement(match[0]);
    Object.assign(node.style, cloudStyle);
  }

  // Icon elements
  const iconMatches = innerContent.matchAll(/<icon([^>]*?)\/?>/gi);
  const icons: string[] = [];
  for (const match of iconMatches) {
    const icon = parseIconElement(match[0]);
    if (icon) icons.push(icon);
  }
  if (icons.length > 0) {
    node.style.icons = icons;
  }

  // Arrow link elements
  const arrowMatches = innerContent.matchAll(/<arrowlink([^>]*?)\/?>/gi);
  for (const match of arrowMatches) {
    const arrowLink = parseArrowLinkElement(match[0], id);
    if (arrowLink) {
      arrowLinks.push(arrowLink);
    }
  }

  // Parse child nodes
  let searchPos = 0;
  while (searchPos < innerContent.length) {
    // Find next child node
    const nodeStartMatch = innerContent.substring(searchPos).match(/<node/i);
    if (!nodeStartMatch) break;

    const nodeStartPos = searchPos + nodeStartMatch.index!;

    // Check if this is inside another element (not a direct child)
    // For simplicity, we'll parse all <node> tags at any level
    const nodeContent = innerContent.substring(nodeStartPos);

    // Find the end of this node (considering nesting)
    const openTagEnd2 = nodeContent.indexOf('>') + 1;
    if (nodeContent[openTagEnd2 - 2] === '/') {
      // Self-closing
      const childNode = parseNodeElement(nodeContent.substring(0, openTagEnd2), arrowLinks, warnings, depth + 1);
      if (childNode) {
        node.children.push(childNode);
      }
      searchPos = nodeStartPos + openTagEnd2;
    } else {
      const closePos = findCloseTagPosition(nodeContent, 'node', openTagEnd2);
      if (closePos === -1) {
        warnings.push({
          type: 'warning',
          message: 'Could not find closing tag for child node',
        });
        break;
      }

      const childContent = nodeContent.substring(0, closePos + '</node>'.length);
      const childNode = parseNodeElement(childContent, arrowLinks, warnings, depth + 1);
      if (childNode) {
        node.children.push(childNode);
      }
      searchPos = nodeStartPos + closePos + '</node>'.length;
    }
  }

  return node;
}

/**
 * Count total nodes in tree
 */
function countNodes(node: FreeMindNode): number {
  let count = 1;
  for (const child of node.children) {
    count += countNodes(child);
  }
  return count;
}

/**
 * Calculate maximum depth of tree
 */
function calculateMaxDepth(node: FreeMindNode, currentDepth: number = 0): number {
  let maxDepth = currentDepth;
  for (const child of node.children) {
    const childDepth = calculateMaxDepth(child, currentDepth + 1);
    if (childDepth > maxDepth) maxDepth = childDepth;
  }
  return maxDepth;
}

/**
 * Main parsing function - Parse FreeMind XML content
 */
export function parseFreeMindXml(xmlContent: string): FreeMindParseResult {
  const startTime = Date.now();
  const warnings: FreeMindParseWarning[] = [];
  const errors: FreeMindParseError[] = [];
  const arrowLinks: FreeMindArrowLink[] = [];

  // Reset ID counter for consistent parsing
  resetIdCounter();

  let rootNode: FreeMindNode | null = null;
  let title = 'Imported Mind Map';
  let version: string | undefined;

  // Normalize line endings and whitespace
  const normalizedContent = xmlContent.replace(/\r\n/g, '\n').trim();

  // Extract map version
  const mapMatch = normalizedContent.match(/<map[^>]*>/i);
  if (!mapMatch) {
    errors.push({
      type: 'error',
      message: 'Invalid FreeMind file: Missing <map> element',
      fatal: true,
    });
    return {
      title,
      version,
      rootNode: null,
      arrowLinks: [],
      warnings,
      errors,
      stats: {
        totalNodes: 0,
        totalArrowLinks: 0,
        maxDepth: 0,
        parseTimeMs: Date.now() - startTime,
      },
    };
  }

  version = extractAttribute(mapMatch[0], 'version');

  // Find the root node (first <node> after <map>)
  const rootNodeMatch = normalizedContent.match(/<map[^>]*>([\s\S]*?)<node/i);
  if (!rootNodeMatch) {
    errors.push({
      type: 'error',
      message: 'Invalid FreeMind file: Missing root <node> element',
      fatal: true,
    });
    return {
      title,
      version,
      rootNode: null,
      arrowLinks: [],
      warnings,
      errors,
      stats: {
        totalNodes: 0,
        totalArrowLinks: 0,
        maxDepth: 0,
        parseTimeMs: Date.now() - startTime,
      },
    };
  }

  // Find the root node start position
  const mapEndPos = mapMatch[0].length;
  const rootNodeStartMatch = normalizedContent.substring(mapEndPos).match(/<node/i);
  if (!rootNodeStartMatch) {
    errors.push({
      type: 'error',
      message: 'Invalid FreeMind file: No root node found',
      fatal: true,
    });
    return {
      title,
      version,
      rootNode: null,
      arrowLinks: [],
      warnings,
      errors,
      stats: {
        totalNodes: 0,
        totalArrowLinks: 0,
        maxDepth: 0,
        parseTimeMs: Date.now() - startTime,
      },
    };
  }

  const rootNodeStartPos = mapEndPos + rootNodeStartMatch.index!;
  const rootNodeContent = normalizedContent.substring(rootNodeStartPos);

  // Find end of root node
  const openTagEnd = rootNodeContent.indexOf('>') + 1;
  const isSelfClosing = rootNodeContent[openTagEnd - 2] === '/';

  let rootNodeFullContent: string;
  if (isSelfClosing) {
    rootNodeFullContent = rootNodeContent.substring(0, openTagEnd);
  } else {
    const closePos = findCloseTagPosition(rootNodeContent, 'node', openTagEnd);
    if (closePos === -1) {
      errors.push({
        type: 'error',
        message: 'Invalid FreeMind file: Root node not properly closed',
        fatal: true,
      });
      return {
        title,
        version,
        rootNode: null,
        arrowLinks: [],
        warnings,
        errors,
        stats: {
          totalNodes: 0,
          totalArrowLinks: 0,
          maxDepth: 0,
          parseTimeMs: Date.now() - startTime,
        },
      };
    }
    rootNodeFullContent = rootNodeContent.substring(0, closePos + '</node>'.length);
  }

  // Parse the root node
  rootNode = parseNodeElement(rootNodeFullContent, arrowLinks, warnings, 0);

  if (rootNode) {
    title = rootNode.text || 'Imported Mind Map';
  }

  const endTime = Date.now();

  return {
    title,
    version,
    rootNode,
    arrowLinks,
    warnings,
    errors,
    stats: {
      totalNodes: rootNode ? countNodes(rootNode) : 0,
      totalArrowLinks: arrowLinks.length,
      maxDepth: rootNode ? calculateMaxDepth(rootNode) : 0,
      parseTimeMs: endTime - startTime,
    },
  };
}

/**
 * Map FreeMind icon to MindMapper icon
 */
function mapIcon(freemindIcon: string): string | undefined {
  // Common FreeMind icons mapped to emoji equivalents
  const iconMap: Record<string, string> = {
    // Priority icons
    'full-1': '1',
    'full-2': '2',
    'full-3': '3',
    'full-4': '4',
    'full-5': '5',
    'full-6': '6',
    'full-7': '7',
    'full-8': '8',
    'full-9': '9',
    // Status icons
    'button_ok': 'check',
    'button_cancel': 'x',
    'help': 'question',
    'messagebox_warning': 'warning',
    'stop': 'stop',
    'go': 'play',
    // Object icons
    'bookmark': 'bookmark',
    'attach': 'paperclip',
    'flag': 'flag',
    'flag-black': 'flag',
    'flag-blue': 'flag',
    'flag-green': 'flag',
    'flag-orange': 'flag',
    'flag-pink': 'flag',
    'flag-yellow': 'flag',
    'star': 'star',
    'yes': 'check',
    'no': 'x',
    'idea': 'lightbulb',
    'info': 'info',
    'clock': 'clock',
    'calendar': 'calendar',
    'launch': 'rocket',
    'home': 'home',
    'folder': 'folder',
    'pencil': 'pencil',
    'edit': 'edit',
  };

  return iconMap[freemindIcon] || freemindIcon;
}

/**
 * Map FreeMind shape to MindMapper shape
 */
function mapShape(freemindShape?: string): 'rectangle' | 'rounded' | 'ellipse' | 'diamond' | 'cloud' {
  switch (freemindShape) {
    case 'bubble':
      return 'ellipse';
    case 'fork':
      return 'rectangle';
    case 'rectangle':
      return 'rectangle';
    default:
      return 'rounded';
  }
}

/**
 * Convert FreeMind node style to MindMapper NodeStyle
 */
function convertNodeStyle(
  fmStyle: FreeMindNodeStyle,
  isRoot: boolean
): Partial<NodeStyle> {
  const style: Partial<NodeStyle> = {};

  // Background color
  if (fmStyle.backgroundColor) {
    style.backgroundColor = fmStyle.backgroundColor;
  } else if (isRoot) {
    style.backgroundColor = '#3b82f6'; // Blue for root
  }

  // Text color
  if (fmStyle.textColor) {
    style.textColor = fmStyle.textColor;
  } else if (isRoot) {
    style.textColor = '#ffffff';
  }

  // Font properties
  if (fmStyle.fontSize) {
    style.fontSize = fmStyle.fontSize;
  } else if (isRoot) {
    style.fontSize = 18;
  }

  if (fmStyle.fontWeight) {
    style.fontWeight = fmStyle.fontWeight;
  } else if (isRoot) {
    style.fontWeight = 'bold';
  }

  if (fmStyle.fontStyle) {
    style.fontStyle = fmStyle.fontStyle;
  }

  // Shape
  if (fmStyle.hasCloud) {
    style.shape = 'cloud';
    if (fmStyle.cloudColor) {
      style.backgroundColor = fmStyle.cloudColor;
    }
  } else {
    style.shape = mapShape(fmStyle.shape);
  }

  // Icon (use first icon if multiple)
  if (fmStyle.icons && fmStyle.icons.length > 0) {
    const mappedIcon = mapIcon(fmStyle.icons[0]);
    if (mappedIcon) {
      style.icon = mappedIcon;
    }
  }

  // Border styling from edge
  if (fmStyle.edgeColor) {
    style.borderColor = fmStyle.edgeColor;
  }

  if (fmStyle.edgeWidth) {
    style.borderWidth = fmStyle.edgeWidth;
  }

  // Border radius based on shape
  if (style.shape === 'ellipse' || style.shape === 'cloud') {
    style.borderRadius = 50;
  } else if (style.shape === 'rectangle') {
    style.borderRadius = 0;
  } else if (isRoot) {
    style.borderRadius = 12;
  } else {
    style.borderRadius = 8;
  }

  return style;
}

/**
 * Convert FreeMind arrow link style to MindMapper ConnectionStyle
 */
function convertConnectionStyle(arrowLink: FreeMindArrowLink): Partial<ConnectionStyle> {
  const style: Partial<ConnectionStyle> = {
    pathType: 'bezier',
    strokeStyle: 'solid',
    strokeWidth: 2,
  };

  if (arrowLink.color) {
    style.strokeColor = arrowLink.color;
  }

  // Arrow markers
  if (arrowLink.startArrow && arrowLink.startArrow !== 'None') {
    style.markerStart = 'arrow';
  }
  if (arrowLink.endArrow && arrowLink.endArrow !== 'None') {
    style.markerEnd = 'arrow';
  }

  return style;
}

/**
 * Layout constants for positioning
 */
const LAYOUT = {
  ROOT_X: 400,
  ROOT_Y: 300,
  HORIZONTAL_SPACING: 250,
  VERTICAL_SPACING: 80,
  MIN_NODE_HEIGHT: 50,
};

/**
 * Calculate positions for nodes in a radial/horizontal layout
 */
function calculatePositions(
  node: FreeMindNode,
  parentId: string | null,
  depth: number,
  yOffset: number,
  side: 'left' | 'right' | 'center',
  result: MindMapperNode[],
  nodeIdMap: Map<string, string>,
  sortOrder: number
): { height: number; nextSortOrder: number } {
  const newId = generateId();
  nodeIdMap.set(node.id, newId);

  const isRoot = depth === 0;

  // Calculate x position based on depth and side
  let x: number;
  if (isRoot) {
    x = LAYOUT.ROOT_X;
  } else if (side === 'left') {
    x = LAYOUT.ROOT_X - (depth * LAYOUT.HORIZONTAL_SPACING);
  } else {
    x = LAYOUT.ROOT_X + (depth * LAYOUT.HORIZONTAL_SPACING);
  }

  // Calculate this node's y position (will be centered among children later)
  let y = yOffset;

  // Calculate height needed for all children
  let childrenHeight = 0;
  let currentYOffset = yOffset;
  let currentSortOrder = sortOrder + 1;

  // Separate children into left and right based on position attribute or balance
  const leftChildren: FreeMindNode[] = [];
  const rightChildren: FreeMindNode[] = [];

  if (isRoot) {
    // For root, use POSITION attribute or balance children
    for (const child of node.children) {
      if (child.position === 'left') {
        leftChildren.push(child);
      } else if (child.position === 'right') {
        rightChildren.push(child);
      } else {
        // Balance unpositioned children
        if (leftChildren.length <= rightChildren.length) {
          leftChildren.push(child);
        } else {
          rightChildren.push(child);
        }
      }
    }
  } else {
    // For non-root, all children go to the same side
    if (side === 'left') {
      leftChildren.push(...node.children);
    } else {
      rightChildren.push(...node.children);
    }
  }

  // Process children and calculate heights
  const processedChildren: { nodes: MindMapperNode[]; height: number }[] = [];

  // Process right children first (if root)
  if (isRoot) {
    let rightY = yOffset - (node.children.length * LAYOUT.VERTICAL_SPACING) / 4;
    for (const child of rightChildren) {
      const childResult = calculatePositions(
        child,
        newId,
        depth + 1,
        rightY,
        'right',
        result,
        nodeIdMap,
        currentSortOrder
      );
      rightY += childResult.height;
      childrenHeight += childResult.height;
      currentSortOrder = childResult.nextSortOrder;
    }

    let leftY = yOffset - (node.children.length * LAYOUT.VERTICAL_SPACING) / 4;
    for (const child of leftChildren) {
      const childResult = calculatePositions(
        child,
        newId,
        depth + 1,
        leftY,
        'left',
        result,
        nodeIdMap,
        currentSortOrder
      );
      leftY += childResult.height;
      childrenHeight += childResult.height;
      currentSortOrder = childResult.nextSortOrder;
    }
  } else {
    // Non-root: process all children
    const allChildren = side === 'left' ? leftChildren : rightChildren;
    for (const child of allChildren) {
      const childResult = calculatePositions(
        child,
        newId,
        depth + 1,
        currentYOffset,
        side,
        result,
        nodeIdMap,
        currentSortOrder
      );
      currentYOffset += childResult.height;
      childrenHeight += childResult.height;
      currentSortOrder = childResult.nextSortOrder;
    }

    // Center this node among its children
    if (node.children.length > 0) {
      y = yOffset + (childrenHeight - LAYOUT.VERTICAL_SPACING) / 2;
    }
  }

  // Calculate node dimensions based on text
  const textLength = node.text.length;
  const width = Math.max(150, Math.min(300, textLength * 8 + 40));
  const height = Math.max(LAYOUT.MIN_NODE_HEIGHT, Math.ceil(textLength / 30) * 25 + 25);

  // Create the MindMapper node
  const mmNode: MindMapperNode = {
    id: newId,
    text: node.text,
    type: isRoot ? 'ROOT' : 'CHILD',
    parentId: parentId ? nodeIdMap.get(parentId.replace('fm-', '')) || parentId : null,
    position: { x, y },
    size: { width, height },
    style: convertNodeStyle(node.style, isRoot),
    metadata: {
      originalId: node.id,
      link: node.link,
      icons: node.style.icons,
    },
    isCollapsed: node.folded || false,
    sortOrder,
  };

  // Fix parentId reference
  if (parentId) {
    mmNode.parentId = parentId;
  }

  result.push(mmNode);

  const totalHeight = Math.max(LAYOUT.VERTICAL_SPACING, childrenHeight);

  return { height: totalHeight, nextSortOrder: currentSortOrder };
}

/**
 * Convert FreeMind parse result to MindMapper format
 */
export function convertToMindMapperFormat(
  parseResult: FreeMindParseResult
): FreeMindConversionResult {
  const nodes: MindMapperNode[] = [];
  const connections: MindMapperConnection[] = [];
  const nodeIdMap = new Map<string, string>();

  if (!parseResult.rootNode) {
    return {
      title: parseResult.title,
      nodes: [],
      connections: [],
      warnings: parseResult.warnings,
      errors: parseResult.errors,
    };
  }

  // Reset ID counter for conversion
  resetIdCounter();

  // Calculate positions for all nodes
  calculatePositions(
    parseResult.rootNode,
    null,
    0,
    LAYOUT.ROOT_Y,
    'center',
    nodes,
    nodeIdMap,
    0
  );

  // Convert arrow links to connections
  for (const arrowLink of parseResult.arrowLinks) {
    const sourceId = nodeIdMap.get(arrowLink.sourceNodeId);
    const targetId = nodeIdMap.get(arrowLink.destinationNodeId);

    if (sourceId && targetId) {
      connections.push({
        sourceNodeId: sourceId,
        targetNodeId: targetId,
        type: 'CROSS_LINK',
        label: null,
        style: convertConnectionStyle(arrowLink),
      });
    } else {
      parseResult.warnings.push({
        type: 'warning',
        message: `Arrow link references unknown node(s): ${arrowLink.sourceNodeId} -> ${arrowLink.destinationNodeId}`,
      });
    }
  }

  return {
    title: parseResult.title,
    nodes,
    connections,
    warnings: parseResult.warnings,
    errors: parseResult.errors,
  };
}

/**
 * Full parsing and conversion function
 * This is the main entry point for importing FreeMind files
 */
export function parseAndConvertFreeMind(xmlContent: string): FreeMindConversionResult {
  const parseResult = parseFreeMindXml(xmlContent);
  return convertToMindMapperFormat(parseResult);
}

/**
 * Validate FreeMind data
 */
export function validateFreeMindData(result: FreeMindParseResult): FreeMindParseResult {
  const { rootNode, warnings, arrowLinks } = result;

  if (!rootNode) {
    return result;
  }

  // Collect all node IDs
  const nodeIds = new Set<string>();
  function collectIds(node: FreeMindNode): void {
    nodeIds.add(node.id);
    for (const child of node.children) {
      collectIds(child);
    }
  }
  collectIds(rootNode);

  // Check arrow link references
  for (const arrowLink of arrowLinks) {
    if (!nodeIds.has(arrowLink.sourceNodeId)) {
      warnings.push({
        type: 'warning',
        message: `Arrow link source not found: ${arrowLink.sourceNodeId}`,
      });
    }
    if (!nodeIds.has(arrowLink.destinationNodeId)) {
      warnings.push({
        type: 'warning',
        message: `Arrow link destination not found: ${arrowLink.destinationNodeId}`,
      });
    }
  }

  // Check for empty text nodes
  function checkEmptyNodes(node: FreeMindNode, path: string = 'root'): void {
    if (!node.text.trim()) {
      warnings.push({
        type: 'warning',
        message: `Empty text in node at ${path}`,
      });
    }
    node.children.forEach((child, index) => {
      checkEmptyNodes(child, `${path}/${index}`);
    });
  }
  checkEmptyNodes(rootNode);

  return result;
}

/**
 * Generate import preview
 */
export function generateFreeMindPreview(result: FreeMindParseResult): {
  summary: {
    title: string;
    version?: string;
    totalNodes: number;
    maxDepth: number;
    arrowLinks: number;
    warnings: number;
    errors: number;
  };
  sampleNodes: Array<{ text: string; depth: number; childCount: number }>;
  issues: string[];
} {
  const sampleNodes: Array<{ text: string; depth: number; childCount: number }> = [];

  function collectSamples(node: FreeMindNode, depth: number): void {
    if (sampleNodes.length < 10) {
      sampleNodes.push({
        text: node.text.substring(0, 50) + (node.text.length > 50 ? '...' : ''),
        depth,
        childCount: node.children.length,
      });
    }
    for (const child of node.children) {
      collectSamples(child, depth + 1);
    }
  }

  if (result.rootNode) {
    collectSamples(result.rootNode, 0);
  }

  return {
    summary: {
      title: result.title,
      version: result.version,
      totalNodes: result.stats.totalNodes,
      maxDepth: result.stats.maxDepth,
      arrowLinks: result.stats.totalArrowLinks,
      warnings: result.warnings.length,
      errors: result.errors.length,
    },
    sampleNodes,
    issues: [
      ...result.errors.map(e => `Error: ${e.message}`),
      ...result.warnings.slice(0, 10).map(w => `Warning: ${w.message}`),
    ],
  };
}
