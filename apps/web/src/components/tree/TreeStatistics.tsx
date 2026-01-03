import { useState, useEffect } from 'react';
import {
  useTreeStatistics,
  TreeStatistics as TreeStatsType,
  getCompletenessColor,
  getCompletenessBgColor,
  formatNumber,
} from '../../hooks/useTreeStatistics';

interface TreeStatisticsProps {
  treeId: string;
}

export function TreeStatistics({ treeId }: TreeStatisticsProps) {
  const { statistics, loading, error, fetchStatistics, generatePdfReport } = useTreeStatistics(treeId);
  const [activeTab, setActiveTab] = useState<'overview' | 'demographics' | 'geography' | 'quality'>('overview');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const blob = await generatePdfReport();
      if (blob) {
        // Open in new window for printing
        const url = URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      }
    } finally {
      setExporting(false);
    }
  };

  if (loading && !statistics) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading statistics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={() => fetchStatistics()}
          className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="text-center py-12 text-gray-500">
        No statistics available
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'demographics' as const, label: 'Demographics' },
    { id: 'geography' as const, label: 'Geography' },
    { id: 'quality' as const, label: 'Data Quality' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Tree Statistics</h2>
        <button
          onClick={handleExportPdf}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && <OverviewTab statistics={statistics} />}
        {activeTab === 'demographics' && <DemographicsTab statistics={statistics} />}
        {activeTab === 'geography' && <GeographyTab statistics={statistics} />}
        {activeTab === 'quality' && <DataQualityTab statistics={statistics} />}
      </div>
    </div>
  );
}

// Overview Tab
function OverviewTab({ statistics }: { statistics: TreeStatsType }) {
  const { overview, ageStatistics } = statistics;

  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Members"
          value={formatNumber(overview.totalMembers)}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          color="blue"
        />
        <StatCard
          label="Living"
          value={formatNumber(overview.livingMembers)}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          }
          color="green"
        />
        <StatCard
          label="Deceased"
          value={formatNumber(overview.deceasedMembers)}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          }
          color="gray"
        />
        <StatCard
          label="Generations"
          value={overview.generations.toString()}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
          color="purple"
        />
      </div>

      {/* Assets Grid */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Family Assets</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{formatNumber(overview.photos)}</div>
            <div className="text-sm text-gray-600">Photos</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{formatNumber(overview.documents)}</div>
            <div className="text-sm text-gray-600">Documents</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{formatNumber(overview.stories)}</div>
            <div className="text-sm text-gray-600">Stories</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{formatNumber(overview.relationships)}</div>
            <div className="text-sm text-gray-600">Relationships</div>
          </div>
        </div>
      </div>

      {/* Notable Members */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notable Members</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {ageStatistics.oldestLiving && (
            <PersonHighlightCard
              title="Oldest Living"
              person={ageStatistics.oldestLiving}
              subtitle={`${ageStatistics.oldestLiving.age} years old`}
            />
          )}
          {ageStatistics.youngestLiving && (
            <PersonHighlightCard
              title="Youngest Living"
              person={ageStatistics.youngestLiving}
              subtitle={`${ageStatistics.youngestLiving.age} years old`}
            />
          )}
          {ageStatistics.longestLived && (
            <PersonHighlightCard
              title="Longest Lived"
              person={ageStatistics.longestLived}
              subtitle={`Lived ${ageStatistics.longestLived.age} years`}
            />
          )}
        </div>
        {!ageStatistics.oldestLiving && !ageStatistics.youngestLiving && !ageStatistics.longestLived && (
          <p className="text-gray-500 text-center py-4">
            Add birth dates to see notable members
          </p>
        )}
      </div>
    </div>
  );
}

// Demographics Tab
function DemographicsTab({ statistics }: { statistics: TreeStatsType }) {
  const { ageStatistics, generationBreakdown, commonSurnames, commonMaidenNames, birthTimeline } = statistics;

  return (
    <div className="space-y-6">
      {/* Age Statistics */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Age Statistics</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Average Age (Living)</span>
              <span className="font-semibold">{ageStatistics.averageLivingAge} years</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Average Lifespan (Deceased)</span>
              <span className="font-semibold">{ageStatistics.averageLifespan} years</span>
            </div>
          </div>
        </div>
      </div>

      {/* Generation Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Generation Breakdown</h3>
        {generationBreakdown.length > 0 ? (
          <div className="space-y-3">
            {generationBreakdown.map(gen => {
              const maxCount = Math.max(...generationBreakdown.map(g => g.count));
              const percentage = (gen.count / maxCount) * 100;
              return (
                <div key={gen.generation} className="flex items-center gap-4">
                  <span className="w-24 text-gray-600">Gen {gen.generation}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-medium">{gen.count}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No generation data available</p>
        )}
      </div>

      {/* Names */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Surnames */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Common Surnames</h3>
          {commonSurnames.length > 0 ? (
            <div className="space-y-2">
              {commonSurnames.slice(0, 10).map((surname, index) => (
                <div key={surname.name} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm w-5">{index + 1}.</span>
                    <span className="font-medium">{surname.name}</span>
                  </span>
                  <span className="text-gray-600">{surname.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No surname data</p>
          )}
        </div>

        {/* Maiden Names */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Maiden Names</h3>
          {commonMaidenNames.length > 0 ? (
            <div className="space-y-2">
              {commonMaidenNames.slice(0, 5).map((name, index) => (
                <div key={name.name} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm w-5">{index + 1}.</span>
                    <span className="font-medium">{name.name}</span>
                  </span>
                  <span className="text-gray-600">{name.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No maiden name data</p>
          )}
        </div>
      </div>

      {/* Birth Timeline */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Births by Decade</h3>
        {birthTimeline.length > 0 ? (
          <div className="h-48 flex items-end gap-1">
            {birthTimeline.map(decade => {
              const maxCount = Math.max(...birthTimeline.map(d => d.count));
              const height = (decade.count / maxCount) * 100;
              return (
                <div
                  key={decade.decade}
                  className="flex-1 flex flex-col items-center"
                >
                  <div
                    className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer group relative"
                    style={{ height: `${Math.max(height, 5)}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {decade.count} births
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 -rotate-45 origin-top-left w-12">
                    {decade.decade}s
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">Add birth dates to see timeline</p>
        )}
      </div>
    </div>
  );
}

// Geography Tab
function GeographyTab({ statistics }: { statistics: TreeStatsType }) {
  const { geographicDistribution } = statistics;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Geographic Distribution</h3>
        {geographicDistribution.length > 0 ? (
          <div className="space-y-3">
            {geographicDistribution.map((location, index) => {
              const maxCount = Math.max(...geographicDistribution.map(l => l.count));
              const percentage = (location.count / maxCount) * 100;
              return (
                <div key={location.location} className="flex items-center gap-4">
                  <span className="w-8 text-gray-400 text-sm">{index + 1}.</span>
                  <span className="w-40 font-medium truncate" title={location.location}>
                    {location.location}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-green-500 h-full rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-gray-600">{location.count}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-gray-500">
              Add birth places to see geographic distribution
            </p>
          </div>
        )}
      </div>

      {/* Map placeholder */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <p className="text-gray-500 mb-2">Interactive Map</p>
        <p className="text-sm text-gray-400">Coming soon: Visual map showing where your ancestors lived</p>
      </div>
    </div>
  );
}

// Data Quality Tab
function DataQualityTab({ statistics }: { statistics: TreeStatsType }) {
  const { dataQuality, overview } = statistics;

  const qualityScore = dataQuality.averageCompleteness;
  const qualityColor = getCompletenessColor(qualityScore);
  const qualityBgColor = getCompletenessBgColor(qualityScore);

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Overall Data Quality</h3>
        <div className="flex items-center justify-center gap-8">
          <div className="relative w-40 h-40">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="10"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={qualityScore >= 80 ? '#22c55e' : qualityScore >= 40 ? '#eab308' : '#ef4444'}
                strokeWidth="10"
                strokeDasharray={`${(qualityScore / 100) * 283} 283`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${qualityColor}`}>{qualityScore}%</span>
              <span className="text-sm text-gray-500">Complete</span>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Complete (80%+)</span>
              </div>
              <span className="font-semibold text-lg">{dataQuality.completeProfiles} profiles</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-600">Partial (40-79%)</span>
              </div>
              <span className="font-semibold text-lg">{dataQuality.partialProfiles} profiles</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-600">Incomplete (&lt;40%)</span>
              </div>
              <span className="font-semibold text-lg">{dataQuality.incompleteProfiles} profiles</span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Coverage */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Coverage</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-600">Birth Date Coverage</span>
              <span className="font-medium">{dataQuality.withBirthDatePercent}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${qualityBgColor}`}
                style={{ width: `${dataQuality.withBirthDatePercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {dataQuality.withBirthDate} of {overview.totalMembers} members
            </p>
          </div>

          {overview.deceasedMembers > 0 && (
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">Death Date Coverage</span>
                <span className="font-medium">
                  {Math.round(((overview.deceasedMembers - dataQuality.deceasedMissingDeathDate) / overview.deceasedMembers) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{
                    width: `${Math.round(((overview.deceasedMembers - dataQuality.deceasedMissingDeathDate) / overview.deceasedMembers) * 100)}%`
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {overview.deceasedMembers - dataQuality.deceasedMissingDeathDate} of {overview.deceasedMembers} deceased members
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Improvement Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Tips to Improve Data Quality
        </h3>
        <ul className="space-y-2 text-blue-800">
          {dataQuality.incompleteProfiles > 0 && (
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span>
                Add more details to {dataQuality.incompleteProfiles} incomplete profile{dataQuality.incompleteProfiles !== 1 ? 's' : ''}
              </span>
            </li>
          )}
          {100 - dataQuality.withBirthDatePercent > 20 && (
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span>Add birth dates to improve age statistics</span>
            </li>
          )}
          {dataQuality.deceasedMissingDeathDate > 0 && (
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span>
                Add death dates for {dataQuality.deceasedMissingDeathDate} deceased member{dataQuality.deceasedMissingDeathDate !== 1 ? 's' : ''}
              </span>
            </li>
          )}
          {overview.photos === 0 && (
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span>Upload photos to bring your family history to life</span>
            </li>
          )}
          {overview.stories === 0 && (
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span>Share family stories to preserve memories</span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

// Reusable Components
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'gray' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    gray: 'bg-gray-100 text-gray-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className={`inline-flex p-2 rounded-lg ${colorClasses[color]} mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}

function PersonHighlightCard({
  title,
  person,
  subtitle,
}: {
  title: string;
  person: { id: string; name: string; profilePhoto?: string | null };
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
      {person.profilePhoto ? (
        <img
          src={person.profilePhoto}
          alt={person.name}
          className="w-12 h-12 rounded-full object-cover"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
          <span className="text-gray-500 text-lg font-medium">
            {person.name.charAt(0)}
          </span>
        </div>
      )}
      <div>
        <div className="text-xs text-gray-500 uppercase tracking-wide">{title}</div>
        <div className="font-medium text-gray-900">{person.name}</div>
        <div className="text-sm text-gray-600">{subtitle}</div>
      </div>
    </div>
  );
}

export default TreeStatistics;
