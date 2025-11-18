import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Eye, MousePointerClick, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { getLocaleString } from '@/lib/locales';

const AnalyticsOverview = ({ data, currentLanguage }) => {
  if (!data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white/10 border-white/20">
            <CardContent className="p-6">
              <div className="h-20 animate-pulse bg-white/10 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      title: getLocaleString('analyticsTotalUsers', currentLanguage),
      value: data.totalUsers?.toLocaleString() || '0',
      change: data.change?.users || 0,
      icon: Users,
      color: 'text-blue-400',
    },
    {
      title: getLocaleString('analyticsTotalSessions', currentLanguage),
      value: data.totalSessions?.toLocaleString() || '0',
      change: data.change?.sessions || 0,
      icon: MousePointerClick,
      color: 'text-purple-400',
    },
    {
      title: getLocaleString('analyticsTotalPageViews', currentLanguage),
      value: data.totalPageViews?.toLocaleString() || '0',
      change: data.change?.pageViews || 0,
      icon: Eye,
      color: 'text-green-400',
    },
    {
      title: getLocaleString('analyticsAvgSessionDuration', currentLanguage),
      value: formatDuration(data.avgSessionDuration),
      change: data.change?.sessionDuration || 0,
      icon: Clock,
      color: 'text-yellow-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const isPositive = stat.change > 0;
        const ChangeIcon = isPositive ? TrendingUp : TrendingDown;

        return (
          <Card key={index} className="bg-white/10 border-white/20 hover:bg-white/15 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">
                {stat.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              {stat.change !== 0 && (
                <div className={`flex items-center text-xs mt-1 ${
                  isPositive ? 'text-green-400' : 'text-red-400'
                }`}>
                  <ChangeIcon className="h-3 w-3 mr-1" />
                  <span>{Math.abs(stat.change).toFixed(1)}%</span>
                  <span className="text-white/60 ml-1">
                    {getLocaleString('analyticsVsPreviousPeriod', currentLanguage)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

/**
 * Format duration in seconds to human-readable format
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

export default AnalyticsOverview;

