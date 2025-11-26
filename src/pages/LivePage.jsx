import React, { useState, useEffect } from 'react';
import { Play, Calendar, Clock, Globe, Share2, Users, Zap } from 'lucide-react';
import { format, addDays, isBefore, addWeeks, differenceInSeconds } from 'date-fns';
import LivePlayer from '../components/LivePlayer';

const LivePage = () => {
  const [timeLeft, setTimeLeft] = useState({});
  const [isLive, setIsLive] = useState(false);
  const [hlsUrl, setHlsUrl] = useState('');
  const [nextStreamTime, setNextStreamTime] = useState(null);

  // Peru timezone
  const PERU_TIMEZONE = 'America/Lima';

  useEffect(() => {
    setHlsUrl('https://dosmundos.pe/hls/1.m3u8');
  }, []);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      
      // Find next Wednesday 9:30 AM Peru time (UTC-5)
      let nextStream = getNextWednesdayStream(now);
      setNextStreamTime(nextStream);
      
      const diffInSeconds = differenceInSeconds(nextStream, now);
      
      // Auto-show as live when time comes (even if no actual stream)
      const isCurrentlyLive = !isBefore(now, nextStream);
      
      if (isCurrentlyLive) {
        setIsLive(true);
        setTimeLeft({ status: 'live' });
      } else {
        setTimeLeft(formatTimeLeft(diffInSeconds));
        setIsLive(false);
      }
    };

    const timer = setInterval(calculateTimeLeft, 1000);
    calculateTimeLeft();

    return () => clearInterval(timer);
  }, []);

  const getNextWednesdayStream = (now) => {
    // Get current UTC time
    const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    
    // Convert to Peru time (UTC-5)
    const peruOffset = -5;
    const peruTime = new Date(utcNow.getTime() + (peruOffset * 3600000));
    
    const currentDay = peruTime.getUTCDay(); // Use UTC day to avoid timezone issues
    const wednesdayDay = 3; // Wednesday is 3 in JS (0=Sunday)
    
    let daysUntilWednesday = wednesdayDay - currentDay;
    if (daysUntilWednesday < 0 || (daysUntilWednesday === 0 && peruTime.getUTCHours() > 9 || (daysUntilWednesday === 0 && peruTime.getUTCHours() === 9 && peruTime.getUTCMinutes() >= 30))) {
      daysUntilWednesday += 7;
    }
    
    // Calculate next Wednesday 9:30 AM Peru time in UTC
    const nextWednesdayPeru = new Date(peruTime.getTime() + (daysUntilWednesday * 24 * 3600000));
    const nextWednesdayUTC = new Date(
      Date.UTC(
        nextWednesdayPeru.getUTCFullYear(),
        nextWednesdayPeru.getUTCMonth(),
        nextWednesdayPeru.getUTCDate(),
        14, // 9:30 AM Peru = 14:30 UTC
        30, // 30 minutes
        0, 0
      )
    );
    
    return nextWednesdayUTC;
  };

  const formatTimeLeft = (totalSeconds) => {
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      status: 'waiting',
      days,
      hours,
      minutes,
      seconds,
      totalSeconds
    };
  };

  const getWorldTimes = () => {
    if (!nextStreamTime) return [];
    
    const timeZones = [
      { city: 'Lima', offset: -5, flag: '🇵🇪' },
      { city: 'New York', offset: -5, flag: '🇺🇸' },
      { city: 'Los Angeles', offset: -8, flag: '🇺🇸' },
      { city: 'Madrid', offset: +1, flag: '🇪🇸' },
      { city: 'London', offset: 0, flag: '🇬🇧' },
      { city: 'Moscow', offset: +3, flag: '🇷🇺' },
      { city: 'Dubai', offset: +4, flag: '🇦🇪' },
      { city: 'Bangkok', offset: +7, flag: '🇹🇭' },
      { city: 'Tokyo', offset: +9, flag: '🇯🇵' },
    ];

    return timeZones.map(({ city, offset, flag }) => {
      // Convert UTC stream time to local time
      const localTime = new Date(nextStreamTime.getTime() + (offset * 3600000));
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayName = days[localTime.getUTCDay()];
      const time = `${String(localTime.getUTCHours()).padStart(2, '0')}:${String(localTime.getUTCMinutes()).padStart(2, '0')}, ${dayName}`;
      return { city, time, flag };
    });
  };


  return (
    <div className="min-h-screen relative jungle-bg">
      {/* Content */}
      <div className="relative z-10">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-400 border border-red-500/30 backdrop-blur-sm">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-sm font-bold uppercase tracking-wider">Live Broadcast</span>
            <Zap className="w-4 h-4" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Медитация с Пепе
            </h1>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              Каждую среду трансляция из Перу с перуанским целителем
            </p>
          </div>
        </div>

        {/* Main Content - Vertical Layout */}
        <div className="space-y-8">
          
          {/* Video Player Section */}
          <div className="bg-slate-900/50 rounded-3xl p-6 backdrop-blur-sm border border-white/10">
            <div className="relative aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 max-w-sm mx-auto">
              {isLive ? (
                <LivePlayer 
                  src={hlsUrl}
                  poster="/images/live-poster.jpg"
                  autoPlay={true}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm">
                  <div className="p-8 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 mb-8 border border-amber-500/30">
                    <Clock className="w-16 h-16 text-amber-400" />
                  </div>
                  
                  <div className="text-center space-y-4">
                    <h3 className="text-3xl font-bold text-white">Следующая трансляция через</h3>
                    
                    {/* Timer Display */}
                    <div className="flex flex-wrap justify-center gap-4 text-center">
                      {timeLeft.status === 'waiting' && (
                        <>
                          {timeLeft.days > 0 && (
                            <div className="bg-white/10 rounded-xl p-4 min-w-[80px]">
                              <div className="text-3xl font-bold text-amber-400">{timeLeft.days}</div>
                              <div className="text-xs text-slate-400 uppercase tracking-wider">Дней</div>
                            </div>
                          )}
                          <div className="bg-white/10 rounded-xl p-4 min-w-[80px]">
                            <div className="text-3xl font-bold text-amber-400">{String(timeLeft.hours).padStart(2, '0')}</div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider">Часов</div>
                          </div>
                          <div className="bg-white/10 rounded-xl p-4 min-w-[80px]">
                            <div className="text-3xl font-bold text-amber-400">{String(timeLeft.minutes).padStart(2, '0')}</div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider">Минут</div>
                          </div>
                          <div className="bg-white/10 rounded-xl p-4 min-w-[80px]">
                            <div className="text-3xl font-bold text-amber-400">{String(timeLeft.seconds).padStart(2, '0')}</div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider">Секунд</div>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="text-slate-400 text-sm mt-4">
                      Начало в {nextStreamTime ? nextStreamTime.toLocaleString('ru-RU') : '...'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="https://www.youtube.com/@DosMundosPeru/streams" target="_blank" rel="noreferrer" 
               className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold transition-all transform hover:scale-105 shadow-lg">
              <Play size={24} fill="currentColor" />
              <span>Смотреть на YouTube</span>
            </a>
            
            <a href="https://www.facebook.com/dosmundosperu" target="_blank" rel="noreferrer"
               className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold transition-all transform hover:scale-105 shadow-lg">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
              </svg>
              <span>Facebook</span>
            </a>
          </div>

          {/* Previous Episodes Link */}
          <div className="text-center">
            <a href="http://dosmundos.pe/episodes" target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-all border border-white/20 backdrop-blur-sm">
              <Calendar size={20} />
              <span>Предыдущие трансляции</span>
            </a>
          </div>

          {/* World Times Card */}
          <div className="bg-slate-900/50 rounded-3xl p-6 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-6 h-6 text-amber-400" />
              <h3 className="text-2xl font-bold text-white">Время трансляции в разных городах</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {getWorldTimes().map(({ city, time, flag }) => (
                <div key={city} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{flag}</span>
                    <span className="font-medium text-slate-200">{city}</span>
                  </div>
                  <span className="font-mono text-amber-400 text-sm">{time}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                <span className="font-semibold text-amber-400">Расписание</span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                Трансляции начинаются каждую среду в <span className="font-bold text-amber-400">9:30 AM по перуанскому времени (GMT-5)</span>.
                Время начала может варьироваться.
              </p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default LivePage;
