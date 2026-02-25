import React, { useState, useEffect } from 'react';
import { Play, Calendar, Clock, Globe, Radio, ChevronRight } from 'lucide-react';
import { isBefore, differenceInSeconds } from 'date-fns';
import LivePlayer from '../components/LivePlayer';

const LivePage = () => {
  const [timeLeft, setTimeLeft] = useState({});
  const [isLive, setIsLive] = useState(false);
  const [hlsUrl, setHlsUrl] = useState('');
  const [nextStreamTime, setNextStreamTime] = useState(null);

  useEffect(() => {
    setHlsUrl('https://dosmundos.pe/hls/1.m3u8');
  }, []);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const nextStream = getNextWednesdayStream(now);
      setNextStreamTime(nextStream);
      const diffInSeconds = differenceInSeconds(nextStream, now);
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
    const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const peruTime = new Date(utcNow.getTime() + (-5 * 3600000));
    const currentDay = peruTime.getUTCDay();
    const wednesdayDay = 3;
    let daysUntilWednesday = wednesdayDay - currentDay;
    if (daysUntilWednesday < 0 || (daysUntilWednesday === 0 && peruTime.getUTCHours() > 9) || (daysUntilWednesday === 0 && peruTime.getUTCHours() === 9 && peruTime.getUTCMinutes() >= 30)) {
      daysUntilWednesday += 7;
    }
    const nextWednesdayPeru = new Date(peruTime.getTime() + (daysUntilWednesday * 24 * 3600000));
    return new Date(Date.UTC(
      nextWednesdayPeru.getUTCFullYear(),
      nextWednesdayPeru.getUTCMonth(),
      nextWednesdayPeru.getUTCDate(),
      14, 30, 0, 0
    ));
  };

  const formatTimeLeft = (totalSeconds) => {
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { status: 'waiting', days, hours, minutes, seconds };
  };

  const getWorldTimes = () => {
    if (!nextStreamTime) return [];
    const timeZones = [
      { city: 'Лима', offset: -5, flag: '🇵🇪' },
      { city: 'Нью-Йорк', offset: -5, flag: '🇺🇸' },
      { city: 'Лос-Анджелес', offset: -8, flag: '🇺🇸' },
      { city: 'Мадрид', offset: +1, flag: '🇪🇸' },
      { city: 'Лондон', offset: 0, flag: '🇬🇧' },
      { city: 'Москва', offset: +3, flag: '🇷🇺' },
      { city: 'Дубай', offset: +4, flag: '🇦🇪' },
      { city: 'Бангкок', offset: +7, flag: '🇹🇭' },
      { city: 'Токио', offset: +9, flag: '🇯🇵' },
    ];
    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return timeZones.map(({ city, offset, flag }) => {
      const localTime = new Date(nextStreamTime.getTime() + (offset * 3600000));
      const dayName = dayNames[localTime.getUTCDay()];
      const time = `${String(localTime.getUTCHours()).padStart(2, '0')}:${String(localTime.getUTCMinutes()).padStart(2, '0')}`;
      return { city, time, dayName, flag };
    });
  };

  const TimeUnit = ({ value, label }) => (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-inner">
          <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums tracking-tight">
            {String(value).padStart(2, '0')}
          </span>
        </div>
      </div>
      <span className="mt-2 text-xs uppercase tracking-widest text-slate-400 font-medium">{label}</span>
    </div>
  );

  const formatStreamDate = () => {
    if (!nextStreamTime) return '...';
    const opts = { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' };
    return nextStreamTime.toLocaleDateString('ru-RU', opts) + ' UTC';
  };

  return (
    <div className="min-h-screen relative jungle-bg">
      <div className="relative z-10">
        <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

          {/* Hero Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <Radio className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-red-400">Live трансляция</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
              Медитация с Пепе
            </h1>
            <p className="text-slate-400 text-base max-w-md mx-auto leading-relaxed">
              Каждую среду — трансляция из Перу с перуанским целителем
            </p>
          </div>

          {/* Player / Countdown Card */}
          <div className="rounded-3xl overflow-hidden border border-white/10 bg-slate-900/60 backdrop-blur-sm shadow-2xl">
            {isLive ? (
              <div className="flex justify-center bg-black py-4">
                <div className="w-full max-w-xs">
                  <LivePlayer
                    src={hlsUrl}
                    poster="/images/live-poster.jpg"
                    autoPlay={true}
                  />
                </div>
              </div>
            ) : (
              <div className="px-6 py-10 sm:py-14 flex flex-col items-center gap-8">
                {/* Countdown label */}
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">До следующей трансляции</span>
                </div>

                {/* Timer blocks */}
                {timeLeft.status === 'waiting' && (
                  <div className="flex items-start justify-center gap-3 sm:gap-5">
                    {timeLeft.days > 0 && (
                      <>
                        <TimeUnit value={timeLeft.days} label="дней" />
                        <span className="text-2xl text-white/30 mt-5">:</span>
                      </>
                    )}
                    <TimeUnit value={timeLeft.hours} label="часов" />
                    <span className="text-2xl text-white/30 mt-5">:</span>
                    <TimeUnit value={timeLeft.minutes} label="минут" />
                    <span className="text-2xl text-white/30 mt-5">:</span>
                    <TimeUnit value={timeLeft.seconds} label="секунд" />
                  </div>
                )}

                {/* Stream date */}
                <p className="text-xs text-slate-500 tracking-wide">
                  Начало: <span className="text-slate-300">{formatStreamDate()}</span>
                </p>

                {/* Divider */}
                <div className="w-full border-t border-white/10" />

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <a
                    href="https://www.youtube.com/@DosMundosPeru/streams"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-[#FF0000] hover:bg-[#cc0000] text-white text-sm font-semibold transition-colors shadow-lg shadow-red-900/30"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    YouTube
                  </a>
                  <a
                    href="https://www.facebook.com/dosmundosperu"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-[#1877F2] hover:bg-[#145fce] text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-900/30"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </a>
                  <a
                    href="/episodes"
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/8 hover:bg-white/15 text-slate-300 hover:text-white text-sm font-medium transition-colors border border-white/10"
                  >
                    <Calendar className="w-4 h-4" />
                    Архив трансляций
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* World Times / Schedule */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
            {/* Section header */}
            <div className="px-6 py-4 border-b border-white/8 flex items-center gap-3">
              <Globe className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <h2 className="text-sm font-semibold text-white">Время в вашем городе</h2>
                <p className="text-xs text-slate-500">Каждую среду в 09:30 по Лиме (GMT−5)</p>
              </div>
            </div>

            {/* Times grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-white/8">
              {getWorldTimes().map(({ city, time, dayName, flag }, i) => (
                <div
                  key={city}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-white/5 transition-colors"
                >
                  <span className="text-xl leading-none">{flag}</span>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400 truncate">{city}</div>
                    <div className="text-sm font-semibold text-white tabular-nums">
                      {time} <span className="text-slate-500 font-normal text-xs">{dayName}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LivePage;
