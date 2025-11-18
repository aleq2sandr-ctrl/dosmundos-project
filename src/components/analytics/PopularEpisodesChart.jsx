import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getLocaleString } from '@/lib/locales';

const PopularEpisodesChart = ({ data, currentLanguage }) => {
  if (!data || data.length === 0) {
    return (
      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white">
            {getLocaleString('analyticsPopularEpisodes', currentLanguage)}
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

  // Truncate episode titles for display
  const chartData = data.map((item, index) => ({
    name: truncateTitle(item.title, 30),
    fullTitle: item.title,
    views: item.views,
    avgDuration: item.avgDuration,
    color: getBarColor(index),
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-black/90 border border-white/20 rounded-lg p-3">
          <p className="text-white font-semibold mb-2">{data.fullTitle}</p>
          <p className="text-blue-400">
            {getLocaleString('analyticsViews', currentLanguage)}: {data.views}
          </p>
          <p className="text-purple-400">
            {getLocaleString('analyticsAvgDuration', currentLanguage)}: {formatDuration(data.avgDuration)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-white/10 border-white/20">
      <CardHeader>
        <CardTitle className="text-white">
          {getLocaleString('analyticsPopularEpisodes', currentLanguage)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis 
              type="number"
              stroke="rgba(255, 255, 255, 0.6)"
              tick={{ fill: 'rgba(255, 255, 255, 0.8)' }}
            />
            <YAxis 
              type="category"
              dataKey="name"
              stroke="rgba(255, 255, 255, 0.6)"
              tick={{ fill: 'rgba(255, 255, 255, 0.8)' }}
              width={120}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="views" radius={[0, 8, 8, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

/**
 * Truncate title to specified length
 */
const truncateTitle = (title, maxLength) => {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength) + '...';
};

/**
 * Get color for bar based on index
 */
const getBarColor = (index) => {
  const colors = [
    '#60a5fa', // blue-400
    '#a78bfa', // purple-400
    '#34d399', // green-400
    '#fbbf24', // yellow-400
    '#f87171', // red-400
    '#fb923c', // orange-400
    '#38bdf8', // sky-400
    '#c084fc', // violet-400
    '#22d3ee', // cyan-400
    '#fb7185', // rose-400
  ];
  return colors[index % colors.length];
};

/**
 * Format duration in seconds
 */
const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

export default PopularEpisodesChart;

