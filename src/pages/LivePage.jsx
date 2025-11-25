import React, { useState, useEffect, useRef } from 'react';
import { Play, Calendar, Clock, Globe, Share2 } from 'lucide-react';
import { format, nextWednesday, set, isBefore, addWeeks } from 'date-fns';

const LivePage = () => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isLive, setIsLive] = useState(false);
  const videoRef = useRef(null);
  const [hlsUrl, setHlsUrl] = useState(''); // Will be set from config or env

  // Peru is UTC-5
  const PERU_OFFSET = -5;

  useEffect(() => {
    // In a real app, this would come from an environment variable
    // For now, we'll assume the VPS IP or a placeholder
    // You need to replace 'YOUR_VPS_IP' with the actual IP or domain
    const streamUrl = `https://dosmundos.pe/hls/stream.m3u8`; 
    // Or better, use a relative path if proxied, or a specific config
    // For this task, I'll use a placeholder that the user needs to configure
    setHlsUrl('https://dosmundos.pe/hls/stream.m3u8');
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

      // Find next Wednesday 21:30 Peru time
      let nextStream = set(nextWednesday(peruTime), { hours: 21, minutes: 30, seconds: 0, milliseconds: 0 });
      
      // If today is Wednesday and it's before 21:30, use today
      if (peruTime.getDay() === 3) {
        const todayStream = set(peruTime, { hours: 21, minutes: 30, seconds: 0, milliseconds: 0 });
        if (isBefore(peruTime, todayStream)) {
          nextStream = todayStream;
        }
      }
      
      // If we are past the stream time on Wednesday, nextWednesday already handles it? 
      // date-fns nextWednesday returns the *next* Wednesday. 
      // If today is Wednesday, nextWednesday returns next week's Wednesday.
      // So we need to check if today is Wednesday and we haven't passed the time yet.
      
      if (peruTime.getDay() === 3) {
         const todayStream = set(peruTime, { hours: 21, minutes: 30, seconds: 0, milliseconds: 0 });
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
      if (diff < 0 && diff > -7200000) {
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

  // HLS setup
  useEffect(() => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    let hls = null;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari, etc)
      video.src = hlsUrl;
    } else {
      // Check if HLS.js is already loaded
      if (window.Hls) {
        if (window.Hls.isSupported()) {
          hls = new window.Hls();
          hls.loadSource(hlsUrl);
          hls.attachMedia(video);
        }
      } else {
        // Load HLS.js from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
        script.async = true;
        script.onload = () => {
          if (window.Hls && window.Hls.isSupported()) {
            hls = new window.Hls();
            hls.loadSource(hlsUrl);
            hls.attachMedia(video);
          }
        };
        document.head.appendChild(script);
      }
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [hlsUrl]);

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
      // Create a date object for the next broadcast in UTC
      // 21:30 PET = 02:30 UTC (Thursday)
      // We need to find the next occurrence
      
      const now = new Date();
      let target = new Date();
      
      // Set to next Wednesday
      const day = target.getDay();
      const diff = 3 - day + (day >= 3 && target.getHours() >= 21 && target.getMinutes() >= 30 ? 7 : 0);
      // This logic is rough, let's just use a reference date for formatting
      
      // Let's use a fixed reference date that is a Wednesday 21:30 PET
      // 2023-11-29 is a Wednesday. 21:30 PET is 2023-11-30 02:30 UTC
      const refDate = new Date('2023-11-30T02:30:00Z'); 
      
      return timeZones.map((tz) => {
          try {
            const timeString = new Intl.DateTimeFormat('en-US', {
                timeZone: tz.zone,
                hour: '2-digit',
                minute: '2-digit',
                weekday: 'short'
            }).format(refDate);
            
            return (
                <div key={tz.city} className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
                    <div className="flex flex-col">
                        <span className="font-medium text-slate-200">{tz.city}</span>
                        <span className="text-xs text-slate-400">{tz.label}</span>
                    </div>
                    <span className="font-mono text-amber-400">{timeString}</span>
                </div>
            );
          } catch (e) {
              return null;
          }
      });
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-sm font-medium uppercase tracking-wider">Live Broadcast</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight">
            Dos Mundos <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Live</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Join us every Wednesday for a live journey through music, culture, and conversation.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Video Player Section (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 group">
              {isLive ? (
                  <video 
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    controls
                    playsInline
                    poster="/images/live-poster.jpg" // You should add a poster image
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

            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <a href="https://youtube.com/@dosmundos" target="_blank" rel="noreferrer" 
                   className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-colors">
                    <Play size={20} fill="currentColor" />
                    Watch on YouTube
                </a>
                <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors">
                    <Share2 size={20} />
                    Share Stream
                </button>
            </div>
          </div>

          {/* Sidebar Info (1 col) */}
          <div className="space-y-8">
            
            {/* Schedule Card */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <Calendar className="w-6 h-6 text-amber-400" />
                <h3 className="text-xl font-bold text-white">Broadcast Schedule</h3>
              </div>
              
              <div className="space-y-1">
                {renderSchedule()}
              </div>

              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-sm text-slate-400 flex items-start gap-2">
                  <Globe className="w-4 h-4 mt-0.5 shrink-0" />
                  Broadcasts originate from Lima, Peru (GMT-5). Times shown are adjusted to your local timezone where possible.
                </p>
              </div>
            </div>

            {/* Platforms */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <h3 className="text-lg font-bold text-white mb-4">Also Streaming On</h3>
                <div className="grid grid-cols-2 gap-3">
                    <a href="#" className="p-3 rounded-lg bg-[#1877F2]/20 hover:bg-[#1877F2]/30 text-[#1877F2] text-center font-medium transition-colors border border-[#1877F2]/20">
                        Facebook
                    </a>
                    <a href="#" className="p-3 rounded-lg bg-[#FF0000]/20 hover:bg-[#FF0000]/30 text-[#FF0000] text-center font-medium transition-colors border border-[#FF0000]/20">
                        YouTube
                    </a>
                    <a href="#" className="p-3 rounded-lg bg-[#6441A5]/20 hover:bg-[#6441A5]/30 text-[#6441A5] text-center font-medium transition-colors border border-[#6441A5]/20">
                        Twitch
                    </a>
                    <a href="#" className="p-3 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-500 text-center font-medium transition-colors border border-orange-500/20">
                        Restream
                    </a>
                </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default LivePage;
