import React, { useState, useEffect } from 'react';
import { usePlayer } from '@/contexts/PlayerContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * PlayerDiagnostics Component
 * 
 * Displays real-time information about the audio player state and provides
 * diagnostic tools to troubleshoot playback issues.
 * 
 * Usage: Append ?debug=true to the URL to enable this component.
 */
const PlayerDiagnostics = () => {
  const { 
    audioRef, 
    isPlaying, 
    currentTime, 
    duration, 
    currentEpisode,
    togglePlay
  } = usePlayer();

  const [audioState, setAudioState] = useState({
    readyState: 0,
    networkState: 0,
    error: null,
    src: '',
    paused: true,
    muted: false,
    volume: 1
  });

  const [urlCheckResult, setUrlCheckResult] = useState(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateState = () => {
      setAudioState({
        readyState: audio.readyState,
        networkState: audio.networkState,
        error: audio.error,
        src: audio.currentSrc || audio.src,
        paused: audio.paused,
        muted: audio.muted,
        volume: audio.volume
      });
    };

    const events = ['loadstart', 'progress', 'suspend', 'abort', 'error', 'emptied', 'stalled', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'playing', 'waiting', 'seeking', 'seeked', 'ended', 'durationchange', 'timeupdate', 'play', 'pause', 'ratechange', 'volumechange'];

    events.forEach(e => audio.addEventListener(e, updateState));
    
    // Initial update
    updateState();

    return () => {
      events.forEach(e => audio.removeEventListener(e, updateState));
    };
  }, [audioRef]);

  const checkAudioUrl = async () => {
    if (!audioState.src) {
      setUrlCheckResult({ status: 'error', message: 'No source URL' });
      return;
    }

    try {
      setUrlCheckResult({ status: 'loading', message: 'Checking...' });
      const response = await fetch(audioState.src, { method: 'HEAD' });
      setUrlCheckResult({
        status: response.ok ? 'success' : 'error',
        message: `Status: ${response.status} ${response.statusText}`,
        headers: {
          'content-type': response.headers.get('content-type'),
          'content-length': response.headers.get('content-length'),
          'accept-ranges': response.headers.get('accept-ranges')
        }
      });
    } catch (error) {
      setUrlCheckResult({ status: 'error', message: error.message });
    }
  };

  const getReadyStateLabel = (state) => {
    const states = {
      0: 'HAVE_NOTHING',
      1: 'HAVE_METADATA',
      2: 'HAVE_CURRENT_DATA',
      3: 'HAVE_FUTURE_DATA',
      4: 'HAVE_ENOUGH_DATA'
    };
    return `${state} (${states[state] || 'UNKNOWN'})`;
  };

  const getNetworkStateLabel = (state) => {
    const states = {
      0: 'NETWORK_EMPTY',
      1: 'NETWORK_IDLE',
      2: 'NETWORK_LOADING',
      3: 'NETWORK_NO_SOURCE'
    };
    return `${state} (${states[state] || 'UNKNOWN'})`;
  };

  const getErrorLabel = (error) => {
    if (!error) return 'None';
    const codes = {
      1: 'MEDIA_ERR_ABORTED',
      2: 'MEDIA_ERR_NETWORK',
      3: 'MEDIA_ERR_DECODE',
      4: 'MEDIA_ERR_SRC_NOT_SUPPORTED'
    };
    return `${error.code} (${codes[error.code] || 'UNKNOWN'}): ${error.message}`;
  };

  if (!currentEpisode) return null;

  return (
    <Card className="fixed bottom-20 right-4 w-96 max-h-[80vh] overflow-y-auto z-50 bg-slate-900/95 border-slate-700 text-xs shadow-xl">
      <CardHeader className="py-2 px-4 border-b border-slate-700 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-mono text-slate-200">Player Diagnostics</CardTitle>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => console.clear()}>🗑️</Button>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        
        {/* Context State */}
        <div className="space-y-1">
          <h3 className="font-bold text-blue-400">Context State</h3>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-slate-300">
            <span>Is Playing:</span>
            <span className={isPlaying ? "text-green-400" : "text-yellow-400"}>{String(isPlaying)}</span>
            <span>Current Time:</span>
            <span>{currentTime.toFixed(3)}s</span>
            <span>Duration:</span>
            <span>{duration.toFixed(3)}s</span>
            <span>Episode:</span>
            <span className="truncate" title={currentEpisode.slug}>{currentEpisode.slug}</span>
          </div>
        </div>

        {/* Audio Element State */}
        <div className="space-y-1">
          <h3 className="font-bold text-purple-400">Audio Element State</h3>
          <div className="grid grid-cols-1 gap-y-1 text-slate-300">
            <div className="flex justify-between">
              <span>Ready State:</span>
              <span className="font-mono">{getReadyStateLabel(audioState.readyState)}</span>
            </div>
            <div className="flex justify-between">
              <span>Network State:</span>
              <span className="font-mono">{getNetworkStateLabel(audioState.networkState)}</span>
            </div>
            <div className="flex justify-between">
              <span>Paused:</span>
              <span className="font-mono">{String(audioState.paused)}</span>
            </div>
            <div className="flex justify-between">
              <span>Muted:</span>
              <span className="font-mono">{String(audioState.muted)}</span>
            </div>
            <div className="flex flex-col">
              <span>Error:</span>
              <span className="font-mono text-red-400">{getErrorLabel(audioState.error)}</span>
            </div>
            <div className="flex flex-col">
              <span>Source:</span>
              <a href={audioState.src} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate text-[10px]">{audioState.src}</a>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <h3 className="font-bold text-green-400">Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" onClick={togglePlay}>
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => audioRef.current?.load()}>
              Force Reload
            </Button>
            <Button size="sm" variant="outline" onClick={checkAudioUrl}>
              Check URL
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              console.log('Audio Ref:', audioRef.current);
              console.log('Context State:', { isPlaying, currentTime, duration, currentEpisode });
            }}>
              Log to Console
            </Button>
          </div>
        </div>

        {/* URL Check Result */}
        {urlCheckResult && (
          <div className={`p-2 rounded border ${urlCheckResult.status === 'success' ? 'bg-green-900/20 border-green-800' : 'bg-red-900/20 border-red-800'}`}>
            <div className="font-bold mb-1">{urlCheckResult.message}</div>
            {urlCheckResult.headers && (
              <pre className="text-[10px] overflow-x-auto">
                {JSON.stringify(urlCheckResult.headers, null, 2)}
              </pre>
            )}
          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default PlayerDiagnostics;
