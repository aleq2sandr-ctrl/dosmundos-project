import React, { useState, useEffect } from 'react';
import { Play, Calendar, Clock, Globe, Share2 } from 'lucide-react';
import { format, nextWednesday, set, isBefore, addWeeks } from 'date-fns';
import LivePlayer from '../components/LivePlayer';

const LivePage = () => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [hlsUrl, setHlsUrl] = useState(''); // Will be set from config or env

  // Peru is UTC-5
  const PERU_OFFSET = -5;

  useEffect(() => {
    // In a real app, this would come from an environment variable
    // For now, we'll assume the VPS IP or a placeholder
    // You need to replace 'YOUR_VPS_IP' with the actual IP or domain
    // The stream key appears to be '1' based on server logs
    const streamUrl = `https://dosmundos.pe/hls/1.m3u8`; 
    // Or better, use a relative path if proxied, or a specific config
    // For this task, I'll use a placeholder that the user needs to configure
    setHlsUrl('https://dosmundos.pe/hls/1.m3u8');
  }, []);

  useEffect(() => {
    const calculateTimeLeft = () => {
      // Force live state for now so we can see the stream
      setIsLive(true);
      setTimeLeft('Live now!');
      return;

      /* Original timer logic - disabled for immediate streaming
      const now = new Date();
      const currentUtc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const peruTime = new Date(currentUtc + (3600000 * PERU_OFFSET));

      // Find next Wednesday 9:30 AM Peru time
      let nextStream = set(nextWednesday(peruTime), { hours: 9, minutes: 30, seconds: 0, milliseconds: 0 });
      
      // If today is Wednesday and it's before 9:30, use today
      if (peruTime.getDay() === 3) {
        const todayStream = set(peruTime, { hours: 9, minutes: 30, seconds: 0, milliseconds: 0 });
        if (isBefore(peruTime, todayStream)) {
          nextStream = todayStream;
        }
      }
      
      // If we are past the stream time on Wednesday, nextWednesday already handles it? 
      // date-fns nextWednesday returns the *next* Wednesday. 
      // If today is Wednesday, nextWednesday returns next week's Wednesday.
      // So we need to check if today is Wednesday and we haven't passed the time yet.
      
      if (peruTime.getDay() === 3) {
         const todayStream = set(peruTime, { hours: 9, minutes: 30, seconds: 0, milliseconds: 0 });
         if (isBefore(peruTime, todayStream)) {
             nextStream = todayStream;
         }
      }

      const diff = nextStream.getTime() - peruTime.getTime();
      
      if (diff < 0) {
        // Should not happen with logic above, but safety check
        setTimeLeft('Live now!');
        setIsLive(true);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      
      // Simple check if we are within a 2 hour window of the start time
      if (diff >= 0 && diff < 7200000) {
          setIsLive(true);
          setTimeLeft('Live now!');
      } else {
          setIsLive(false);
      }
      */
    };

    const timer = setInterval(calculateTimeLeft, 1000);
    calculateTimeLeft();

    return () => clearInterval(timer);
  }, []);

  const timeZones = [
    { city: 'Lima', zone: 'America/Lima', label: 'Peru' },
    { city: 'New York', zone: 'America/New_York', label: 'USA (East)' },
    { city: 'Los Angeles', zone: 'America/Los_Angeles', label: 'USA (West)' },
    { city: 'Madrid', zone: 'Europe/Madrid', label: 'Spain' },
    { city: 'London', zone: 'Europe/London', label: 'UK' },
    { city: 'Moscow', zone: 'Europe/Moscow', label: 'Russia' },
  ];

  const getLocalTime = (zone) => {
    // Calculate next Wednesday 21:30 Peru time in UTC
    // Peru is UTC-5 fixed (mostly)
    const now = new Date();
    // ... logic to find next wednesday 21:30 UTC-5 ...
    // Simplified: just show the time string for that zone
    
    // We want to show what 21:30 PET is in other zones.
    // 21:30 PET = 02:30 UTC (next day)
    
    // Create a date object that represents next Wednesday 21:30 PET
    // We can use a fixed date for formatting purposes, e.g., next Wed
    
    // This is a bit complex to do perfectly without a library like luxon or date-fns-tz
    // But we can use Intl.DateTimeFormat
    
    // Let's just hardcode the offsets for display or use a helper
    return "Check local time"; 
  };

  // Better approach for the schedule:
  // 21:30 PET is the anchor.
  // We can display the time in different zones.
  
  const renderSchedule = () => {
      const cities = [
          { city: 'Lima', time: '9:30 AM' },
          { city: 'Madrid', time: '2:30 PM' },
          { city: 'Moscow', time: '4:30 PM' },
          { city: 'Bangkok', time: '8:30 PM' },
          { city: 'Sydney', time: '12:30 AM (Thu)' },
      ];
      
      return cities.map((city) => (
          <div key={city.city} className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
              <span className="font-medium text-slate-200">{city.city}</span>
              <span className="font-mono text-amber-400">{city.time}</span>
          </div>
      ));
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-8 pb-6 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-sm font-medium uppercase tracking-wider">Live Broadcast</span>
          </div>
          <p className="text-lg text-slate-200 max-w-2xl mx-auto">
            Каждую среду медитация с перуанским целителем Пепе
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-3xl mx-auto space-y-4">
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 group">
              {isLive ? (
                  <LivePlayer 
                    src={hlsUrl}
                    poster="/images/live-poster.jpg"
                    autoPlay={true}
                  />
              ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm">
                      <div className="p-6 rounded-full bg-white/5 mb-6">
                          <Clock className="w-12 h-12 text-slate-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Next Broadcast In</h3>
                      <div className="text-4xl md:text-6xl font-mono font-bold text-amber-400 tracking-wider">
                          {timeLeft}
                      </div>
                  </div>
              )}
              
              {/* Overlay for offline state if needed */}
            </div>

            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <a href="https://youtube.com/@dosmundos" target="_blank" rel="noreferrer" 
                   className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-colors">
                    <Play size={20} fill="currentColor" />
                    Watch on YouTube
                </a>
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors">
                    <Share2 size={20} />
                    Share Stream
                </button>
            </div>

            {/* Schedule Card */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">Broadcast Times</h3>
              </div>
              
              <div className="space-y-1">
                {renderSchedule()}
              </div>

              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-slate-400">
                  Broadcasts start every Wednesday at 9:30 AM Peru time (GMT-5).
                </p>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LivePage;
