import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, RefreshCw, Download, Calendar, BarChart3 } from 'lucide-react';
import { getLocaleString } from '@/lib/locales';
import { useToast } from '@/components/ui/use-toast';
import {
  getOverviewStats,
  getVisitorsData,
  getPopularEpisodes,
  getGeographyData,
  getDevicesData,
  getTrafficSources,
  getListeningStats,
  getBehaviorMetrics,
  clearAnalyticsCache,
} from '@/lib/gaDataService';

// Import analytics components
import AnalyticsOverview from '@/components/analytics/AnalyticsOverview';
import VisitorsChart from '@/components/analytics/VisitorsChart';
import PopularEpisodesChart from '@/components/analytics/PopularEpisodesChart';
import GeographyMap from '@/components/analytics/GeographyMap';
import DevicesBreakdown from '@/components/analytics/DevicesBreakdown';
import TrafficSources from '@/components/analytics/TrafficSources';
import ListeningStats from '@/components/analytics/ListeningStats';
import BehaviorMetrics from '@/components/analytics/BehaviorMetrics';

const AnalyticsPage = ({ currentLanguage }) => {
  const { lang } = useParams();
  const actualCurrentLanguage = lang || currentLanguage || 'ru';
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('7d');
  const [activeTab, setActiveTab] = useState('overview');

  // Data state
  const [overviewData, setOverviewData] = useState(null);
  const [visitorsData, setVisitorsData] = useState(null);
  const [popularEpisodes, setPopularEpisodes] = useState(null);
  const [geographyData, setGeographyData] = useState(null);
  const [devicesData, setDevicesData] = useState(null);
  const [trafficSourcesData, setTrafficSourcesData] = useState(null);
  const [listeningStatsData, setListeningStatsData] = useState(null);
  const [behaviorMetricsData, setBehaviorMetricsData] = useState(null);

  // Load all analytics data
  const loadAnalyticsData = async (useCache = true) => {
    try {
      setLoading(true);

      const [
        overview,
        visitors,
        episodes,
        geography,
        devices,
        traffic,
        listening,
        behavior,
      ] = await Promise.all([
        getOverviewStats(null, null, useCache),
        getVisitorsData(period, useCache),
        getPopularEpisodes(10, useCache),
        getGeographyData(useCache),
        getDevicesData(useCache),
        getTrafficSources(useCache),
        getListeningStats(useCache),
        getBehaviorMetrics(useCache),
      ]);

      setOverviewData(overview);
      setVisitorsData(visitors);
      setPopularEpisodes(episodes);
      setGeographyData(geography);
      setDevicesData(devices);
      setTrafficSourcesData(traffic);
      setListeningStatsData(listening);
      setBehaviorMetricsData(behavior);
    } catch (error) {
      console.error('[AnalyticsPage] Failed to load analytics data:', error);
      toast({
        title: getLocaleString('analyticsError', actualCurrentLanguage),
        description: getLocaleString('analyticsErrorDesc', actualCurrentLanguage),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadAnalyticsData(true);
  }, [period]);

  // Refresh data
  const handleRefresh = () => {
    setRefreshing(true);
    clearAnalyticsCache();
    loadAnalyticsData(false);
  };

  // Export report (placeholder for future implementation)
  const handleExportReport = () => {
    toast({
      title: getLocaleString('analyticsExportReport', actualCurrentLanguage),
      description: getLocaleString('analyticsExportReportDesc', actualCurrentLanguage),
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <BarChart3 className="h-8 w-8" />
                {getLocaleString('analyticsTitle', actualCurrentLanguage)}
              </h1>
              <p className="text-white/60 mt-1">
                {getLocaleString('analyticsSubtitle', actualCurrentLanguage)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Period Selector */}
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">
                  {getLocaleString('analyticsLast24Hours', actualCurrentLanguage)}
                </SelectItem>
                <SelectItem value="7d">
                  {getLocaleString('analyticsLast7Days', actualCurrentLanguage)}
                </SelectItem>
                <SelectItem value="30d">
                  {getLocaleString('analyticsLast30Days', actualCurrentLanguage)}
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>

            {/* Export Button */}
            <Button
              variant="outline"
              onClick={handleExportReport}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Download className="h-4 w-4 mr-2" />
              {getLocaleString('analyticsExport', actualCurrentLanguage)}
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && !refreshing ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-12 w-12 animate-spin text-white/60 mx-auto mb-4" />
              <p className="text-white/60">{getLocaleString('loading', actualCurrentLanguage)}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="mb-6">
              <AnalyticsOverview data={overviewData} currentLanguage={actualCurrentLanguage} />
            </div>

            {/* Tabs for Different Analytics Sections */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="bg-white/10 border-white/20">
                <TabsTrigger value="overview" className="data-[state=active]:bg-white/20">
                  {getLocaleString('analyticsOverview', actualCurrentLanguage)}
                </TabsTrigger>
                <TabsTrigger value="audience" className="data-[state=active]:bg-white/20">
                  {getLocaleString('analyticsAudience', actualCurrentLanguage)}
                </TabsTrigger>
                <TabsTrigger value="content" className="data-[state=active]:bg-white/20">
                  {getLocaleString('analyticsContent', actualCurrentLanguage)}
                </TabsTrigger>
                <TabsTrigger value="behavior" className="data-[state=active]:bg-white/20">
                  {getLocaleString('analyticsBehavior', actualCurrentLanguage)}
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <VisitorsChart data={visitorsData} currentLanguage={actualCurrentLanguage} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TrafficSources data={trafficSourcesData} currentLanguage={actualCurrentLanguage} />
                  <DevicesBreakdown data={devicesData} currentLanguage={actualCurrentLanguage} />
                </div>
              </TabsContent>

              {/* Audience Tab */}
              <TabsContent value="audience" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <GeographyMap data={geographyData} currentLanguage={actualCurrentLanguage} />
                  <DevicesBreakdown data={devicesData} currentLanguage={actualCurrentLanguage} />
                </div>
                <TrafficSources data={trafficSourcesData} currentLanguage={actualCurrentLanguage} />
              </TabsContent>

              {/* Content Tab */}
              <TabsContent value="content" className="space-y-6">
                <PopularEpisodesChart data={popularEpisodes} currentLanguage={actualCurrentLanguage} />
                <ListeningStats data={listeningStatsData} currentLanguage={actualCurrentLanguage} />
              </TabsContent>

              {/* Behavior Tab */}
              <TabsContent value="behavior" className="space-y-6">
                <BehaviorMetrics data={behaviorMetricsData} currentLanguage={actualCurrentLanguage} />
                <VisitorsChart data={visitorsData} currentLanguage={actualCurrentLanguage} />
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Footer Note */}
        <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10">
          <p className="text-white/60 text-sm text-center">
            {getLocaleString('analyticsFooterNote', actualCurrentLanguage)}
          </p>
        </div>
      </div>
    </div>
  );
};

AnalyticsPage.propTypes = {
  currentLanguage: PropTypes.string,
};

export default AnalyticsPage;

