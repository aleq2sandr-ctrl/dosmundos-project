import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ExternalLink, Search, Share2, Mail, Users } from 'lucide-react';
import { getLocaleString } from '@/lib/locales';

const TrafficSources = ({ data, currentLanguage }) => {
  if (!data || data.length === 0) {
    return (
      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white">
            {getLocaleString('analyticsTrafficSources', currentLanguage)}
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

  const COLORS = {
    direct: '#60a5fa',
    organic: '#34d399',
    social: '#a78bfa',
    referral: '#fbbf24',
    email: '#f87171',
  };

  const getSourceIcon = (source) => {
    switch (source) {
      case 'direct':
        return Users;
      case 'organic':
        return Search;
      case 'social':
        return Share2;
      case 'referral':
        return ExternalLink;
      case 'email':
        return Mail;
      default:
        return Users;
    }
  };

  const chartData = data.map((item) => ({
    name: item.source,
    value: item.users,
    percentage: item.percentage,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-black/90 border border-white/20 rounded-lg p-3">
          <p className="text-white font-semibold capitalize">{data.name}</p>
          <p className="text-blue-400">
            {getLocaleString('analyticsUsers', currentLanguage)}: {data.value.toLocaleString()}
          </p>
          <p className="text-purple-400">{data.payload.percentage}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-white/10 border-white/20">
      <CardHeader>
        <CardTitle className="text-white">
          {getLocaleString('analyticsTrafficSources', currentLanguage)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
                label={({ percentage }) => `${percentage}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#888'} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-3 w-full md:w-auto">
            {data.map((source, index) => {
              const Icon = getSourceIcon(source.source);
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors min-w-[200px]"
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: COLORS[source.source] }}
                  />
                  <Icon className="h-4 w-4 text-white/80" />
                  <div className="flex-1">
                    <p className="text-white capitalize">{source.source}</p>
                    <p className="text-white/60 text-sm">
                      {source.users.toLocaleString()} {getLocaleString('analyticsUsers', currentLanguage)}
                    </p>
                  </div>
                  <span className="text-white font-medium">{source.percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrafficSources;

