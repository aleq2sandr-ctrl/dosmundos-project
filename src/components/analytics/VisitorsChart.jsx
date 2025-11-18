import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getLocaleString } from '@/lib/locales';

const VisitorsChart = ({ data, currentLanguage }) => {
  if (!data || data.length === 0) {
    return (
      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white">
            {getLocaleString('analyticsVisitorsOverTime', currentLanguage)}
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

  // Format data for chart
  const chartData = data.map((item) => ({
    date: formatDate(item.date),
    [getLocaleString('analyticsUsers', currentLanguage)]: item.users,
    [getLocaleString('analyticsSessions', currentLanguage)]: item.sessions,
  }));

  return (
    <Card className="bg-white/10 border-white/20">
      <CardHeader>
        <CardTitle className="text-white">
          {getLocaleString('analyticsVisitorsOverTime', currentLanguage)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis 
              dataKey="date" 
              stroke="rgba(255, 255, 255, 0.6)"
              tick={{ fill: 'rgba(255, 255, 255, 0.8)' }}
            />
            <YAxis 
              stroke="rgba(255, 255, 255, 0.6)"
              tick={{ fill: 'rgba(255, 255, 255, 0.8)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Legend 
              wrapperStyle={{ color: '#fff' }}
            />
            <Line
              type="monotone"
              dataKey={getLocaleString('analyticsUsers', currentLanguage)}
              stroke="#60a5fa"
              strokeWidth={2}
              dot={{ fill: '#60a5fa' }}
            />
            <Line
              type="monotone"
              dataKey={getLocaleString('analyticsSessions', currentLanguage)}
              stroke="#a78bfa"
              strokeWidth={2}
              dot={{ fill: '#a78bfa' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

/**
 * Format date for display
 */
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
};

export default VisitorsChart;

