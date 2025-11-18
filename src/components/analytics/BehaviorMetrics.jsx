import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Clock, FileText, Search, Filter, Share2, Download } from 'lucide-react';
import { getLocaleString } from '@/lib/locales';

const BehaviorMetrics = ({ data, currentLanguage }) => {
  if (!data) {
    return (
      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white">
            {getLocaleString('analyticsBehaviorMetrics', currentLanguage)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-white/60">{getLocaleString('analyticsNoData', currentLanguage)}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const mainMetrics = [
    {
      icon: Activity,
      label: getLocaleString('analyticsBounceRate', currentLanguage),
      value: `${data.bounceRate}%`,
      description: getLocaleString('analyticsBounceRateDesc', currentLanguage),
      color: 'text-red-400',
    },
    {
      icon: Clock,
      label: getLocaleString('analyticsAvgSessionDuration', currentLanguage),
      value: formatDuration(data.avgSessionDuration),
      description: getLocaleString('analyticsAvgSessionDurationDesc', currentLanguage),
      color: 'text-blue-400',
    },
    {
      icon: FileText,
      label: getLocaleString('analyticsPagesPerSession', currentLanguage),
      value: data.pagesPerSession?.toFixed(1),
      description: getLocaleString('analyticsPagesPerSessionDesc', currentLanguage),
      color: 'text-purple-400',
    },
  ];

  const interactions = [
    {
      icon: Search,
      label: getLocaleString('analyticsSearches', currentLanguage),
      value: data.interactions?.searches?.toLocaleString() || '0',
      color: 'bg-blue-500',
    },
    {
      icon: Filter,
      label: getLocaleString('analyticsFilters', currentLanguage),
      value: data.interactions?.filters?.toLocaleString() || '0',
      color: 'bg-purple-500',
    },
    {
      icon: Share2,
      label: getLocaleString('analyticsShares', currentLanguage),
      value: data.interactions?.shares?.toLocaleString() || '0',
      color: 'bg-green-500',
    },
    {
      icon: Download,
      label: getLocaleString('analyticsDownloads', currentLanguage),
      value: data.interactions?.downloads?.toLocaleString() || '0',
      color: 'bg-yellow-500',
    },
  ];

  return (
    <Card className="bg-white/10 border-white/20">
      <CardHeader>
        <CardTitle className="text-white">
          {getLocaleString('analyticsBehaviorMetrics', currentLanguage)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Main Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mainMetrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <div
                  key={index}
                  className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`h-5 w-5 ${metric.color}`} />
                    <span className="text-white/80 text-sm">{metric.label}</span>
                  </div>
                  <p className="text-3xl font-bold text-white mb-2">{metric.value}</p>
                  <p className="text-xs text-white/50">{metric.description}</p>
                </div>
              );
            })}
          </div>

          {/* User Interactions */}
          <div>
            <h3 className="text-white font-medium mb-4">
              {getLocaleString('analyticsUserInteractions', currentLanguage)}
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {interactions.map((interaction, index) => {
                const Icon = interaction.icon;
                return (
                  <div
                    key={index}
                    className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${interaction.color}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-white mb-1">
                      {interaction.value}
                    </p>
                    <p className="text-sm text-white/60">{interaction.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Engagement Score */}
          <div className="p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium mb-1">
                  {getLocaleString('analyticsEngagementScore', currentLanguage)}
                </h3>
                <p className="text-white/60 text-sm">
                  {getLocaleString('analyticsEngagementScoreDesc', currentLanguage)}
                </p>
              </div>
              <div className="text-4xl font-bold text-white">
                {calculateEngagementScore(data)}
                <span className="text-lg text-white/60">/100</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Format duration in seconds
 */
const formatDuration = (seconds) => {
  if (!seconds) return '0s';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${remainingSeconds}s`;
};

/**
 * Calculate engagement score based on various metrics
 */
const calculateEngagementScore = (data) => {
  if (!data) return 0;

  // Simple scoring algorithm
  let score = 0;

  // Low bounce rate is good (inverted)
  score += (100 - (data.bounceRate || 50)) * 0.3;

  // High pages per session is good
  score += Math.min((data.pagesPerSession || 0) * 10, 30);

  // Longer session duration is good (capped at 300 seconds = 5 minutes)
  score += Math.min((data.avgSessionDuration || 0) / 10, 30);

  // Interactions add to score
  const totalInteractions = (data.interactions?.searches || 0) +
                           (data.interactions?.filters || 0) +
                           (data.interactions?.shares || 0) +
                           (data.interactions?.downloads || 0);
  score += Math.min(totalInteractions / 100, 10);

  return Math.round(Math.min(score, 100));
};

export default BehaviorMetrics;

