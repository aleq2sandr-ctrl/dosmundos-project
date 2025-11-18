import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe } from 'lucide-react';
import { getLocaleString } from '@/lib/locales';

const GeographyMap = ({ data, currentLanguage }) => {
  if (!data || data.length === 0) {
    return (
      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {getLocaleString('analyticsGeography', currentLanguage)}
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

  return (
    <Card className="bg-white/10 border-white/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Globe className="h-5 w-5" />
          {getLocaleString('analyticsGeography', currentLanguage)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {data.map((location, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{location.city}</span>
                  <span className="text-white/60 text-sm">{location.country}</span>
                </div>
              </div>
              <div className="flex gap-6 text-sm">
                <div className="text-right">
                  <p className="text-white/60">{getLocaleString('analyticsUsers', currentLanguage)}</p>
                  <p className="text-white font-semibold">{location.users.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/60">{getLocaleString('analyticsSessions', currentLanguage)}</p>
                  <p className="text-white font-semibold">{location.sessions.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default GeographyMap;

