import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Smartphone, Monitor, Tablet, Globe } from 'lucide-react';
import { getLocaleString } from '@/lib/locales';

const DevicesBreakdown = ({ data, currentLanguage }) => {
  if (!data || (!data.devices && !data.browsers)) {
    return (
      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white">
            {getLocaleString('analyticsDevices', currentLanguage)}
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

  const deviceColors = {
    mobile: '#60a5fa',
    desktop: '#a78bfa',
    tablet: '#34d399',
  };

  const browserColors = ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#f87171'];

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'mobile':
        return Smartphone;
      case 'desktop':
        return Monitor;
      case 'tablet':
        return Tablet;
      default:
        return Globe;
    }
  };

  const renderCustomLabel = ({ name, percentage }) => {
    return `${name}: ${percentage}%`;
  };

  return (
    <Card className="bg-white/10 border-white/20">
      <CardHeader>
        <CardTitle className="text-white">
          {getLocaleString('analyticsDevices', currentLanguage)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Devices Chart */}
          {data.devices && data.devices.length > 0 && (
            <div>
              <h3 className="text-white font-medium mb-4">
                {getLocaleString('analyticsDeviceTypes', currentLanguage)}
              </h3>
              <div className="flex flex-col md:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.devices}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="type"
                    >
                      {data.devices.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={deviceColors[entry.type] || '#888'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-2 w-full md:w-auto">
                  {data.devices.map((device, index) => {
                    const Icon = getDeviceIcon(device.type);
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-2 bg-white/5 rounded-lg"
                      >
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: deviceColors[device.type] }}
                        />
                        <Icon className="h-4 w-4 text-white/80" />
                        <span className="text-white capitalize">{device.type}</span>
                        <span className="text-white/60 ml-auto">
                          {device.percentage}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Browsers List */}
          {data.browsers && data.browsers.length > 0 && (
            <div className="mt-6">
              <h3 className="text-white font-medium mb-4">
                {getLocaleString('analyticsBrowsers', currentLanguage)}
              </h3>
              <div className="space-y-2">
                {data.browsers.map((browser, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <Globe className="h-4 w-4 text-white/80" />
                    <span className="text-white flex-1">{browser.name}</span>
                    <span className="text-white/60">{browser.count.toLocaleString()}</span>
                    <div className="w-16 text-right">
                      <span className="text-white font-medium">{browser.percentage}%</span>
                    </div>
                    <div className="w-32 bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${browser.percentage}%`,
                          backgroundColor: browserColors[index % browserColors.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DevicesBreakdown;

