import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Headphones, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { getLocaleString } from '@/lib/locales';

const ListeningStats = ({ data, currentLanguage }) => {
  if (!data) {
    return (
      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white">
            {getLocaleString('analyticsListeningStats', currentLanguage)}
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

  const stats = [
    {
      icon: Clock,
      label: getLocaleString('analyticsAvgListeningTime', currentLanguage),
      value: formatDuration(data.avgListeningTime),
      color: 'text-blue-400',
    },
    {
      icon: CheckCircle,
      label: getLocaleString('analyticsCompletionRate', currentLanguage),
      value: `${data.completionRate}%`,
      color: 'text-green-400',
    },
    {
      icon: Headphones,
      label: getLocaleString('analyticsTotalPlays', currentLanguage),
      value: data.totalPlays?.toLocaleString(),
      color: 'text-purple-400',
    },
    {
      icon: TrendingUp,
      label: getLocaleString('analyticsTotalCompletions', currentLanguage),
      value: data.totalCompletions?.toLocaleString(),
      color: 'text-yellow-400',
    },
  ];

  const chartData = data.mostActiveHours?.map((item) => ({
    hour: `${item.hour}:00`,
    plays: item.plays,
  })) || [];

  return (
    <Card className="bg-white/10 border-white/20">
      <CardHeader>
        <CardTitle className="text-white">
          {getLocaleString('analyticsListeningStats', currentLanguage)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                  <p className="text-sm text-white/60">{stat.label}</p>
                </div>
              );
            })}
          </div>

          {/* Most Active Hours Chart */}
          {chartData.length > 0 && (
            <div className="mt-6">
              <h3 className="text-white font-medium mb-4">
                {getLocaleString('analyticsMostActiveHours', currentLanguage)}
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis
                    dataKey="hour"
                    stroke="rgba(255, 255, 255, 0.6)"
                    tick={{ fill: 'rgba(255, 255, 255, 0.8)' }}
                  />
                  <YAxis
                    stroke="rgba(255, 255, 255, 0.6)"
                    tick={{ fill: 'rgba(255, 255, 255, 0.8)' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="plays" fill="#a78bfa" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Format duration in seconds to human-readable format
 */
const formatDuration = (seconds) => {
  if (!seconds) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  return `${minutes}:${String(secs).padStart(2, '0')}`;
};

export default ListeningStats;

