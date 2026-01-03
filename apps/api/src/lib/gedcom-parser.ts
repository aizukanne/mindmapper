/**
 * GEDCOM 5.5+ Parser
 *
 * Parses GEDCOM files into a structured format suitable for importing
 * into the family tree database.
 *
 * GEDCOM structure:
 * - Lines are formatted as: LEVEL [XREF_ID] TAG [VALUE]
 * - Level 0: Records (INDI, FAM, etc.)
 * - Level 1+: Nested data within records
 */

// GEDCOM Record Types
export interface GedcomIndividual {
  id: string;           // GEDCOM XREF ID (e.g., @I1@)
  firstName: string;
  middleName?: string;
  lastName: string;
  maidenName?: string;
  suffix?: string;
  nickname?: string;
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  isLiving: boolean;
  occupation?: string;
  education?: string;
  notes?: string;
  // Raw GEDCOM data for reference
  rawData?: Record<string, unknown>;
}

export interface GedcomFamily {
  id: string;           // GEDCOM XREF ID (e.g., @F1@)
  husbandId?: string;   // Reference to individual
  wifeId?: string;      // Reference to individual
  childIds: string[];   // References to individuals
  marriageDate?: string;
  marriagePlace?: string;
  divorceDate?: string;
  divorcePlace?: string;
}

export interface GedcomParseResult {
  individuals: GedcomIndividual[];
  families: GedcomFamily[];
  header: {
    source?: string;
    version?: string;
    charset?: string;
    submitter?: string;
  };
  warnings: GedcomWarning[];
  errors: GedcomError[];
  stats: {
    totalLines: number;
    individualsFound: number;
    familiesFound: number;
    parseTimeMs: number;
  };
}

export interface GedcomWarning {
  line: number;
  message: string;
  context?: string;
}

export interface GedcomError {
  line: number;
  message: string;
  context?: string;
  fatal: boolean;
}

// Parsed GEDCOM line
interface GedcomLine {
  level: number;
  xref?: string;
  tag: string;
  value?: string;
  lineNumber: number;
}

/**
 * Parse a GEDCOM file content into structured data
 */
export function parseGedcom(content: string): GedcomParseResult {
  const startTime = Date.now();
  const lines = content.split(/\r?\n/);
  const warnings: GedcomWarning[] = [];
  const errors: GedcomError[] = [];

  const individuals: Map<string, GedcomIndividual> = new Map();
  const families: Map<string, GedcomFamily> = new Map();
  const header: GedcomParseResult['header'] = {};

  // Parse all lines
  const parsedLines: GedcomLine[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parsed = parseLine(line, i + 1);
    if (parsed) {
      parsedLines.push(parsed);
    } else if (line) {
      warnings.push({
        line: i + 1,
        message: 'Could not parse line',
        context: line.substring(0, 50),
      });
    }
  }

  // Process records
  let currentRecord: { type: string; id?: string; lines: GedcomLine[] } | null = null;

  for (const line of parsedLines) {
    if (line.level === 0) {
      // Process previous record
      if (currentRecord) {
        processRecord(currentRecord, individuals, families, header, warnings, errors);
      }

      // Start new record
      if (line.xref) {
        currentRecord = {
          type: line.tag,
          id: line.xref,
          lines: [line],
        };
      } else if (line.tag === 'HEAD') {
        currentRecord = { type: 'HEAD', lines: [line] };
      } else if (line.tag === 'TRLR') {
        currentRecord = null; // End of file
      } else {
        currentRecord = { type: line.tag, lines: [line] };
      }
    } else if (currentRecord) {
      currentRecord.lines.push(line);
    }
  }

  // Process last record
  if (currentRecord) {
    processRecord(currentRecord, individuals, families, header, warnings, errors);
  }

  const endTime = Date.now();

  return {
    individuals: Array.from(individuals.values()),
    families: Array.from(families.values()),
    header,
    warnings,
    errors,
    stats: {
      totalLines: lines.length,
      individualsFound: individuals.size,
      familiesFound: families.size,
      parseTimeMs: endTime - startTime,
    },
  };
}

/**
 * Parse a single GEDCOM line
 * Format: LEVEL [XREF_ID] TAG [VALUE]
 */
function parseLine(line: string, lineNumber: number): GedcomLine | null {
  // Match: level, optional xref, tag, optional value
  const match = line.match(/^(\d+)\s+(@[^@]+@)?\s*(\S+)\s*(.*)$/);
  if (!match) return null;

  const [, levelStr, xref, tag, value] = match;
  return {
    level: parseInt(levelStr, 10),
    xref: xref?.replace(/@/g, ''),
    tag: tag.toUpperCase(),
    value: value?.trim() || undefined,
    lineNumber,
  };
}

/**
 * Process a complete GEDCOM record
 */
function processRecord(
  record: { type: string; id?: string; lines: GedcomLine[] },
  individuals: Map<string, GedcomIndividual>,
  families: Map<string, GedcomFamily>,
  header: GedcomParseResult['header'],
  warnings: GedcomWarning[],
  errors: GedcomError[]
): void {
  switch (record.type) {
    case 'INDI':
      if (record.id) {
        const individual = parseIndividual(record.id, record.lines, warnings);
        individuals.set(record.id, individual);
      }
      break;

    case 'FAM':
      if (record.id) {
        const family = parseFamily(record.id, record.lines, warnings);
        families.set(record.id, family);
      }
      break;

    case 'HEAD':
      parseHeader(record.lines, header);
      break;

    case 'SUBM':
    case 'SOUR':
    case 'NOTE':
      // Skip these record types for now
      break;

    default:
      // Unknown record type
      break;
  }
}

/**
 * Parse an individual (INDI) record
 */
function parseIndividual(
  id: string,
  lines: GedcomLine[],
  warnings: GedcomWarning[]
): GedcomIndividual {
  const individual: GedcomIndividual = {
    id,
    firstName: '',
    lastName: '',
    gender: 'UNKNOWN',
    isLiving: true,
  };

  let currentEvent: string | null = null;
  let eventData: { date?: string; place?: string } = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const tag = line.tag;
    const value = line.value;

    if (line.level === 1) {
      // Save previous event
      if (currentEvent === 'BIRT') {
        individual.birthDate = eventData.date;
        individual.birthPlace = eventData.place;
      } else if (currentEvent === 'DEAT') {
        individual.deathDate = eventData.date;
        individual.deathPlace = eventData.place;
        individual.isLiving = false;
      }

      currentEvent = null;
      eventData = {};

      switch (tag) {
        case 'NAME':
          if (value) {
            const nameParts = parseGedcomName(value);
            individual.firstName = nameParts.firstName;
            individual.middleName = nameParts.middleName;
            individual.lastName = nameParts.lastName;
          }
          break;

        case 'SEX':
          if (value === 'M') individual.gender = 'MALE';
          else if (value === 'F') individual.gender = 'FEMALE';
          else individual.gender = 'UNKNOWN';
          break;

        case 'BIRT':
          currentEvent = 'BIRT';
          break;

        case 'DEAT':
          currentEvent = 'DEAT';
          individual.isLiving = false;
          break;

        case 'OCCU':
          individual.occupation = value;
          break;

        case 'EDUC':
          individual.education = value;
          break;

        case 'NICK':
          individual.nickname = value;
          break;

        case 'NOTE':
          individual.notes = value;
          break;
      }
    } else if (line.level === 2) {
      // Sub-tags of events
      if (currentEvent) {
        if (tag === 'DATE') {
          eventData.date = parseGedcomDate(value);
        } else if (tag === 'PLAC') {
          eventData.place = value;
        }
      }

      // Sub-tags of NAME
      if (tag === 'GIVN' && !individual.firstName) {
        individual.firstName = value || '';
      } else if (tag === 'SURN' && !individual.lastName) {
        individual.lastName = value || '';
      } else if (tag === '_MARNM' || tag === 'MARNM') {
        // Married name - could be maiden name for women
        individual.maidenName = value;
      } else if (tag === 'NSFX') {
        individual.suffix = value;
      } else if (tag === 'NICK') {
        individual.nickname = value;
      }
    }
  }

  // Save last event
  if (currentEvent === 'BIRT') {
    individual.birthDate = eventData.date;
    individual.birthPlace = eventData.place;
  } else if (currentEvent === 'DEAT') {
    individual.deathDate = eventData.date;
    individual.deathPlace = eventData.place;
    individual.isLiving = false;
  }

  return individual;
}

/**
 * Parse a family (FAM) record
 */
function parseFamily(
  id: string,
  lines: GedcomLine[],
  warnings: GedcomWarning[]
): GedcomFamily {
  const family: GedcomFamily = {
    id,
    childIds: [],
  };

  let currentEvent: string | null = null;
  let eventData: { date?: string; place?: string } = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const tag = line.tag;
    const value = line.value;

    if (line.level === 1) {
      // Save previous event
      if (currentEvent === 'MARR') {
        family.marriageDate = eventData.date;
        family.marriagePlace = eventData.place;
      } else if (currentEvent === 'DIV') {
        family.divorceDate = eventData.date;
        family.divorcePlace = eventData.place;
      }

      currentEvent = null;
      eventData = {};

      switch (tag) {
        case 'HUSB':
          if (value) {
            family.husbandId = value.replace(/@/g, '');
          }
          break;

        case 'WIFE':
          if (value) {
            family.wifeId = value.replace(/@/g, '');
          }
          break;

        case 'CHIL':
          if (value) {
            family.childIds.push(value.replace(/@/g, ''));
          }
          break;

        case 'MARR':
          currentEvent = 'MARR';
          break;

        case 'DIV':
          currentEvent = 'DIV';
          break;
      }
    } else if (line.level === 2 && currentEvent) {
      if (tag === 'DATE') {
        eventData.date = parseGedcomDate(value);
      } else if (tag === 'PLAC') {
        eventData.place = value;
      }
    }
  }

  // Save last event
  if (currentEvent === 'MARR') {
    family.marriageDate = eventData.date;
    family.marriagePlace = eventData.place;
  } else if (currentEvent === 'DIV') {
    family.divorceDate = eventData.date;
    family.divorcePlace = eventData.place;
  }

  return family;
}

/**
 * Parse header record
 */
function parseHeader(
  lines: GedcomLine[],
  header: GedcomParseResult['header']
): void {
  let inSource = false;

  for (const line of lines) {
    if (line.level === 1) {
      inSource = line.tag === 'SOUR';
      if (inSource && line.value) {
        header.source = line.value;
      } else if (line.tag === 'CHAR') {
        header.charset = line.value;
      } else if (line.tag === 'GEDC') {
        // GEDCOM version is in sub-tag
      }
    } else if (line.level === 2) {
      if (line.tag === 'VERS') {
        header.version = line.value;
      } else if (line.tag === 'NAME' && inSource) {
        header.source = line.value;
      }
    }
  }
}

/**
 * Parse GEDCOM name format: FirstName MiddleName /LastName/Suffix
 */
function parseGedcomName(name: string): {
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
} {
  // Remove extra spaces
  name = name.trim().replace(/\s+/g, ' ');

  // Extract surname (between slashes)
  const surnameMatch = name.match(/\/([^/]*)\//);
  const lastName = surnameMatch ? surnameMatch[1].trim() : '';

  // Get the part before the surname
  const beforeSurname = surnameMatch
    ? name.substring(0, name.indexOf('/')).trim()
    : name;

  // Get the part after the surname (suffix)
  const afterSurname = surnameMatch
    ? name.substring(name.lastIndexOf('/') + 1).trim()
    : '';

  // Split first part into first and middle names
  const nameParts = beforeSurname.split(' ').filter(Boolean);
  const firstName = nameParts[0] || '';
  const middleName = nameParts.slice(1).join(' ') || undefined;

  return {
    firstName,
    middleName,
    lastName,
    suffix: afterSurname || undefined,
  };
}

/**
 * Parse GEDCOM date format to ISO-like string
 * GEDCOM dates can be: 1 JAN 2000, JAN 2000, 2000, ABT 1 JAN 2000, etc.
 */
function parseGedcomDate(date?: string): string | undefined {
  if (!date) return undefined;

  // Remove qualifiers like ABT, BEF, AFT, etc.
  let cleanDate = date
    .replace(/^(ABT|ABOUT|BEF|BEFORE|AFT|AFTER|EST|CAL|INT|FROM|TO|BET|AND)\s*/gi, '')
    .trim();

  // Handle date ranges - just take the first date
  if (cleanDate.includes(' - ')) {
    cleanDate = cleanDate.split(' - ')[0].trim();
  }
  if (cleanDate.includes(' TO ')) {
    cleanDate = cleanDate.split(' TO ')[0].trim();
  }

  // Month abbreviations
  const months: Record<string, string> = {
    JAN: '01', FEB: '02', MAR: '03', APR: '04',
    MAY: '05', JUN: '06', JUL: '07', AUG: '08',
    SEP: '09', OCT: '10', NOV: '11', DEC: '12',
  };

  // Try to parse: DD MMM YYYY
  let match = cleanDate.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/i);
  if (match) {
    const [, day, month, year] = match;
    const monthNum = months[month.toUpperCase()];
    if (monthNum) {
      return `${year}-${monthNum}-${day.padStart(2, '0')}`;
    }
  }

  // Try to parse: MMM YYYY
  match = cleanDate.match(/^([A-Z]{3})\s+(\d{4})$/i);
  if (match) {
    const [, month, year] = match;
    const monthNum = months[month.toUpperCase()];
    if (monthNum) {
      return `${year}-${monthNum}-01`;
    }
  }

  // Try to parse: YYYY
  match = cleanDate.match(/^(\d{4})$/);
  if (match) {
    return `${match[1]}-01-01`;
  }

  // Return original if can't parse
  return date;
}

/**
 * Validate parsed GEDCOM data and add warnings for issues
 */
export function validateGedcomData(result: GedcomParseResult): GedcomParseResult {
  const { individuals, families, warnings } = result;
  const individualIds = new Set(individuals.map(i => i.id));

  // Check for individuals without names
  for (const ind of individuals) {
    if (!ind.firstName && !ind.lastName) {
      warnings.push({
        line: 0,
        message: `Individual ${ind.id} has no name`,
      });
    }
  }

  // Check for referenced individuals that don't exist
  for (const fam of families) {
    if (fam.husbandId && !individualIds.has(fam.husbandId)) {
      warnings.push({
        line: 0,
        message: `Family ${fam.id} references unknown husband ${fam.husbandId}`,
      });
    }
    if (fam.wifeId && !individualIds.has(fam.wifeId)) {
      warnings.push({
        line: 0,
        message: `Family ${fam.id} references unknown wife ${fam.wifeId}`,
      });
    }
    for (const childId of fam.childIds) {
      if (!individualIds.has(childId)) {
        warnings.push({
          line: 0,
          message: `Family ${fam.id} references unknown child ${childId}`,
        });
      }
    }
  }

  // Check for future dates
  const now = new Date();
  for (const ind of individuals) {
    if (ind.birthDate) {
      const birthDate = new Date(ind.birthDate);
      if (birthDate > now) {
        warnings.push({
          line: 0,
          message: `Individual ${ind.id} has future birth date: ${ind.birthDate}`,
        });
      }
    }
    if (ind.deathDate) {
      const deathDate = new Date(ind.deathDate);
      if (deathDate > now) {
        warnings.push({
          line: 0,
          message: `Individual ${ind.id} has future death date: ${ind.deathDate}`,
        });
      }
    }
  }

  return result;
}

/**
 * Convert GEDCOM gender to our Gender enum
 */
export function convertGender(gender: GedcomIndividual['gender']): 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN' {
  switch (gender) {
    case 'MALE': return 'MALE';
    case 'FEMALE': return 'FEMALE';
    default: return 'UNKNOWN';
  }
}

/**
 * Generate import preview summary
 */
export function generateImportPreview(result: GedcomParseResult): {
  summary: {
    individuals: number;
    families: number;
    marriages: number;
    warnings: number;
    errors: number;
  };
  sampleIndividuals: GedcomIndividual[];
  sampleFamilies: GedcomFamily[];
  issues: string[];
} {
  const marriageCount = result.families.filter(f => f.marriageDate || f.marriagePlace).length;

  return {
    summary: {
      individuals: result.individuals.length,
      families: result.families.length,
      marriages: marriageCount,
      warnings: result.warnings.length,
      errors: result.errors.length,
    },
    sampleIndividuals: result.individuals.slice(0, 10),
    sampleFamilies: result.families.slice(0, 5),
    issues: [
      ...result.errors.map(e => `Error: ${e.message}`),
      ...result.warnings.slice(0, 20).map(w => `Warning: ${w.message}`),
    ],
  };
}
