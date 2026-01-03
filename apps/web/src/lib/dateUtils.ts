/**
 * Calculate age from birth date
 * @param birthDate - Birth date as Date or string
 * @param deathDate - Optional death date for deceased persons
 * @returns Age string (e.g., "42 years old" or "Died at 85")
 */
export function calculateAge(birthDate: Date | string, deathDate?: Date | string | null): string | null {
  if (!birthDate) return null;

  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const end = deathDate
    ? (typeof deathDate === 'string' ? new Date(deathDate) : deathDate)
    : new Date();

  const ageInMs = end.getTime() - birth.getTime();
  const ageInYears = Math.floor(ageInMs / (1000 * 60 * 60 * 24 * 365.25));

  if (ageInYears < 0) return null;

  if (deathDate) {
    return `Died at ${ageInYears}`;
  }

  return `${ageInYears} years old`;
}

/**
 * Format a date for display
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Get year from date
 * @param date - Date to extract year from
 * @returns Year as string
 */
export function getYear(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getFullYear().toString();
}
