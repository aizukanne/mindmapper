import { useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface PersonHighlight {
  id: string;
  name: string;
  age: number;
  profilePhoto?: string | null;
}

export interface GenerationBreakdown {
  generation: number;
  count: number;
}

export interface LocationCount {
  location: string;
  count: number;
}

export interface NameCount {
  name: string;
  count: number;
}

export interface DecadeCount {
  decade: number;
  count: number;
}

export interface TreeStatistics {
  overview: {
    totalMembers: number;
    livingMembers: number;
    deceasedMembers: number;
    generations: number;
    photos: number;
    documents: number;
    stories: number;
    relationships: number;
  };
  generationBreakdown: GenerationBreakdown[];
  ageStatistics: {
    oldestLiving: PersonHighlight | null;
    youngestLiving: PersonHighlight | null;
    longestLived: PersonHighlight | null;
    averageLivingAge: number;
    averageLifespan: number;
  };
  geographicDistribution: LocationCount[];
  commonSurnames: NameCount[];
  commonMaidenNames: NameCount[];
  dataQuality: {
    averageCompleteness: number;
    completeProfiles: number;
    partialProfiles: number;
    incompleteProfiles: number;
    withBirthDate: number;
    withBirthDatePercent: number;
    deceasedMissingDeathDate: number;
  };
  birthTimeline: DecadeCount[];
}

interface UseTreeStatisticsResult {
  statistics: TreeStatistics | null;
  loading: boolean;
  error: string | null;
  fetchStatistics: () => Promise<TreeStatistics | null>;
  generatePdfReport: () => Promise<Blob | null>;
}

export function useTreeStatistics(treeId: string): UseTreeStatisticsResult {
  const [statistics, setStatistics] = useState<TreeStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = useCallback(async (): Promise<TreeStatistics | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/family-trees/${treeId}/statistics`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch statistics');
      }

      const data = await response.json();
      setStatistics(data.data);
      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, [treeId]);

  const generatePdfReport = useCallback(async (): Promise<Blob | null> => {
    if (!statistics) {
      setError('No statistics data available. Fetch statistics first.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Generate PDF client-side using the statistics data
      const pdfContent = generatePdfContent(statistics);
      const blob = new Blob([pdfContent], { type: 'text/html' });
      return blob;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
      return null;
    } finally {
      setLoading(false);
    }
  }, [statistics]);

  return {
    statistics,
    loading,
    error,
    fetchStatistics,
    generatePdfReport,
  };
}

// Helper function to generate printable HTML report
function generatePdfContent(stats: TreeStatistics): string {
  const { overview, ageStatistics, geographicDistribution, commonSurnames, dataQuality, birthTimeline } = stats;

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Family Tree Statistics Report</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #333;
    }
    h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #1e40af; margin-top: 30px; }
    .section { margin-bottom: 30px; }
    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
    .stat-box {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-value { font-size: 24px; font-weight: bold; color: #2563eb; }
    .stat-label { font-size: 12px; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f3f4f6; font-weight: 600; }
    .progress-bar {
      background: #e5e7eb;
      border-radius: 9999px;
      height: 8px;
      overflow: hidden;
    }
    .progress-fill {
      background: #2563eb;
      height: 100%;
      border-radius: 9999px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    @media print {
      .stat-grid { break-inside: avoid; }
      .section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>Family Tree Statistics Report</h1>
  <p>Generated on ${new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}</p>

  <div class="section">
    <h2>Overview</h2>
    <div class="stat-grid">
      <div class="stat-box">
        <div class="stat-value">${overview.totalMembers}</div>
        <div class="stat-label">Total Members</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${overview.livingMembers}</div>
        <div class="stat-label">Living</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${overview.deceasedMembers}</div>
        <div class="stat-label">Deceased</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${overview.generations}</div>
        <div class="stat-label">Generations</div>
      </div>
    </div>
    <div class="stat-grid">
      <div class="stat-box">
        <div class="stat-value">${overview.photos}</div>
        <div class="stat-label">Photos</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${overview.documents}</div>
        <div class="stat-label">Documents</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${overview.stories}</div>
        <div class="stat-label">Stories</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${overview.relationships}</div>
        <div class="stat-label">Relationships</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Age Statistics</h2>
    <table>
      <tr>
        <td><strong>Oldest Living Member</strong></td>
        <td>${ageStatistics.oldestLiving ? `${ageStatistics.oldestLiving.name} (${ageStatistics.oldestLiving.age} years)` : 'N/A'}</td>
      </tr>
      <tr>
        <td><strong>Youngest Living Member</strong></td>
        <td>${ageStatistics.youngestLiving ? `${ageStatistics.youngestLiving.name} (${ageStatistics.youngestLiving.age} years)` : 'N/A'}</td>
      </tr>
      <tr>
        <td><strong>Longest Lived Ancestor</strong></td>
        <td>${ageStatistics.longestLived ? `${ageStatistics.longestLived.name} (${ageStatistics.longestLived.age} years)` : 'N/A'}</td>
      </tr>
      <tr>
        <td><strong>Average Age (Living)</strong></td>
        <td>${ageStatistics.averageLivingAge} years</td>
      </tr>
      <tr>
        <td><strong>Average Lifespan (Deceased)</strong></td>
        <td>${ageStatistics.averageLifespan} years</td>
      </tr>
    </table>
  </div>

  ${geographicDistribution.length > 0 ? `
  <div class="section">
    <h2>Geographic Distribution</h2>
    <table>
      <thead>
        <tr>
          <th>Location</th>
          <th>Members</th>
        </tr>
      </thead>
      <tbody>
        ${geographicDistribution.slice(0, 10).map(loc => `
          <tr>
            <td>${loc.location}</td>
            <td>${loc.count}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${commonSurnames.length > 0 ? `
  <div class="section">
    <h2>Most Common Surnames</h2>
    <table>
      <thead>
        <tr>
          <th>Surname</th>
          <th>Count</th>
        </tr>
      </thead>
      <tbody>
        ${commonSurnames.slice(0, 10).map(s => `
          <tr>
            <td>${s.name}</td>
            <td>${s.count}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="section">
    <h2>Data Quality</h2>
    <table>
      <tr>
        <td><strong>Average Profile Completeness</strong></td>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="progress-bar" style="flex: 1;">
              <div class="progress-fill" style="width: ${dataQuality.averageCompleteness}%;"></div>
            </div>
            <span>${dataQuality.averageCompleteness}%</span>
          </div>
        </td>
      </tr>
      <tr>
        <td><strong>Complete Profiles (80%+)</strong></td>
        <td>${dataQuality.completeProfiles}</td>
      </tr>
      <tr>
        <td><strong>Partial Profiles (40-79%)</strong></td>
        <td>${dataQuality.partialProfiles}</td>
      </tr>
      <tr>
        <td><strong>Incomplete Profiles (<40%)</strong></td>
        <td>${dataQuality.incompleteProfiles}</td>
      </tr>
      <tr>
        <td><strong>Birth Date Coverage</strong></td>
        <td>${dataQuality.withBirthDatePercent}% (${dataQuality.withBirthDate} members)</td>
      </tr>
      <tr>
        <td><strong>Deceased Missing Death Date</strong></td>
        <td>${dataQuality.deceasedMissingDeathDate}</td>
      </tr>
    </table>
  </div>

  ${birthTimeline.length > 0 ? `
  <div class="section">
    <h2>Birth Timeline by Decade</h2>
    <table>
      <thead>
        <tr>
          <th>Decade</th>
          <th>Births</th>
        </tr>
      </thead>
      <tbody>
        ${birthTimeline.map(d => `
          <tr>
            <td>${d.decade}s</td>
            <td>${d.count}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="footer">
    <p>This report was generated by MindMapper Family Tree</p>
  </div>
</body>
</html>
  `.trim();
}

// Format percentage for display
export function formatPercentage(value: number): string {
  return `${value}%`;
}

// Get color class based on completeness level
export function getCompletenessColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

// Get background color class based on completeness level
export function getCompletenessBgColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

// Format large numbers with comma separators
export function formatNumber(num: number): string {
  return num.toLocaleString();
}
