/**
 * PlayerContext — full engine test suite
 * Tests: seek guards, drag suppression, seekAndPlay atomicity, timeupdate filtering,
 *        playEpisode, togglePlay, error recovery, edge cases.
 */
import React from 'react';
import { render, act, screen } from '@testing-library/react';
import { PlayerProvider, usePlayer } from '@/contexts/PlayerContext';

// ─── Mock HTMLMediaElement ───────────────────────────────────────────────────

function createMockAudio() {
  let _src = '';
  let _currentTime = 0;
  let _duration = NaN;
  let _paused = true;
  let _playbackRate = 1;
  let _muted = false;
  const listeners = {};

  return {
    get src() { return _src; },
    set src(v) { _src = v; },
    get currentTime() { return _currentTime; },
    set currentTime(v) { _currentTime = v; },
    get duration() { return _duration; },
    set duration(v) { _duration = v; },
    get paused() { return _paused; },
    get playbackRate() { return _playbackRate; },
    set playbackRate(v) { _playbackRate = v; },
    get muted() { return _muted; },
    set muted(v) { _muted = v; },
    get ended() { return false; },
    get readyState() { return _src ? 4 : 0; },
    get error() { return null; },

    play: vi.fn(async () => { _paused = false; }),
    pause: vi.fn(() => { _paused = true; }),
    load: vi.fn(async () => {}),

    addEventListener: vi.fn((event, cb, opts) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
    }),
    removeEventListener: vi.fn((event, cb) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter(fn => fn !== cb);
      }
    }),

    // Test helpers
    _setDuration(d) { _duration = d; },
    _setPaused(p) { _paused = p; },
    _emit(event) {
      (listeners[event] || []).forEach(fn => fn());
    },
    _listeners: listeners,
  };
}

// ─── Test harness: renders a consumer that exposes PlayerContext via callbacks ─

function PlayerTestConsumer({ onContext }) {
  const ctx = usePlayer();
  React.useEffect(() => { onContext(ctx); });
  return null;
}

function renderWithPlayer() {
  let ctx;
  const onContext = (c) => { ctx = c; };

  const result = render(
    <PlayerProvider>
      <PlayerTestConsumer onContext={onContext} />
    </PlayerProvider>
  );

  // Grab the <audio> rendered by PlayerProvider
  const audio = result.container.querySelector('audio');

  return { getCtx: () => ctx, audio, ...result };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('PlayerContext', () => {

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── Basic state ──

  test('initial state is idle', () => {
    const { getCtx } = renderWithPlayer();
    const ctx = getCtx();
    expect(ctx.isPlaying).toBe(false);
    expect(ctx.currentTime).toBe(0);
    expect(ctx.duration).toBe(0);
    expect(ctx.currentEpisode).toBeNull();
    expect(ctx.isLoading).toBe(false);
    expect(ctx.autoplayBlocked).toBe(false);
  });

  // ── Seek ──

  describe('seek()', () => {
    test('sets currentTime on audio element and state', () => {
      const { getCtx, audio } = renderWithPlayer();
      const ctx = getCtx();

      // Give audio a duration so clamping works
      Object.defineProperty(audio, 'duration', { value: 300, writable: true, configurable: true });

      act(() => { ctx.seek(42); });

      expect(audio.currentTime).toBe(42);
      expect(getCtx().currentTime).toBe(42);
    });

    test('clamps to [0, duration]', () => {
      const { getCtx, audio } = renderWithPlayer();
      Object.defineProperty(audio, 'duration', { value: 100, writable: true, configurable: true });

      act(() => { getCtx().seek(-10); });
      expect(audio.currentTime).toBe(0);

      act(() => { getCtx().seek(200); });
      expect(audio.currentTime).toBe(100);
    });

    test('does nothing if audioRef is null', () => {
      // Should not throw
      const { getCtx } = renderWithPlayer();
      // We can't easily null the ref, but we can test that seek(NaN) doesn't crash
      act(() => { getCtx().seek(NaN); });
      // No error thrown = pass
    });
  });

  // ── Seeking guard (timeupdate suppression) ──

  describe('seeking guard', () => {
    test('timeupdate is suppressed during seek', () => {
      const { getCtx, audio } = renderWithPlayer();
      Object.defineProperty(audio, 'duration', { value: 300, writable: true, configurable: true });

      // Seek to 100
      act(() => { getCtx().seek(100); });
      expect(getCtx().currentTime).toBe(100);

      // Simulate browser firing timeupdate with OLD position (this was the bug)
      Object.defineProperty(audio, 'currentTime', { value: 5, writable: true, configurable: true });
      act(() => { audio.dispatchEvent(new Event('timeupdate')); });

      // currentTime should NOT have been overwritten
      expect(getCtx().currentTime).toBe(100);
    });

    test('seeking guard releases after seeked event', () => {
      const { getCtx, audio } = renderWithPlayer();
      Object.defineProperty(audio, 'duration', { value: 300, writable: true, configurable: true });

      act(() => { getCtx().seek(100); });

      // Browser fires seeked
      act(() => { audio.dispatchEvent(new Event('seeked')); });

      // After 50ms delay, guard should release
      act(() => { vi.advanceTimersByTime(60); });

      // Now timeupdate should work
      Object.defineProperty(audio, 'currentTime', { value: 101, writable: true, configurable: true });
      act(() => { audio.dispatchEvent(new Event('timeupdate')); });
      expect(getCtx().currentTime).toBe(101);
    });

    test('seeking guard releases via safety timeout if seeked never fires', () => {
      const { getCtx, audio } = renderWithPlayer();
      Object.defineProperty(audio, 'duration', { value: 300, writable: true, configurable: true });

      act(() => { getCtx().seek(100); });

      // Wait for safety timeout (2 seconds)
      act(() => { vi.advanceTimersByTime(2100); });

      // Guard should now be released
      Object.defineProperty(audio, 'currentTime', { value: 102, writable: true, configurable: true });
      act(() => { audio.dispatchEvent(new Event('timeupdate')); });
      expect(getCtx().currentTime).toBe(102);
    });
  });

  // ── Drag suppression ──

  describe('drag operations (startDragging / stopDragging)', () => {
    test('timeupdate is suppressed while dragging', () => {
      const { getCtx, audio } = renderWithPlayer();
      Object.defineProperty(audio, 'duration', { value: 300, writable: true, configurable: true });

      act(() => { getCtx().startDragging(); });

      // Seek to 50 (simulating user dragging)
      act(() => { getCtx().seek(50); });
      expect(getCtx().currentTime).toBe(50);

      // Browser fires timeupdate with stale value
      Object.defineProperty(audio, 'currentTime', { value: 10, writable: true, configurable: true });
      act(() => { audio.dispatchEvent(new Event('timeupdate')); });

      // Must still show 50
      expect(getCtx().currentTime).toBe(50);

      // Multiple rapid seeks (dragging)
      act(() => { getCtx().seek(55); });
      act(() => { getCtx().seek(60); });
      act(() => { getCtx().seek(65); });
      expect(getCtx().currentTime).toBe(65);

      // Release drag
      act(() => { getCtx().stopDragging(); });

      // After 100ms delay, guard releases
      act(() => { vi.advanceTimersByTime(150); });

      // Now timeupdate resumes normally
      Object.defineProperty(audio, 'currentTime', { value: 66, writable: true, configurable: true });
      act(() => { audio.dispatchEvent(new Event('timeupdate')); });
      expect(getCtx().currentTime).toBe(66);
    });

    test('stopDragging does not release guard if user started dragging again', () => {
      const { getCtx, audio } = renderWithPlayer();
      Object.defineProperty(audio, 'duration', { value: 300, writable: true, configurable: true });

      act(() => { getCtx().startDragging(); });
      act(() => { getCtx().seek(50); });
      act(() => { getCtx().stopDragging(); });

      // Immediately start dragging again (before 100ms delay)
      act(() => { getCtx().startDragging(); });
      act(() => { vi.advanceTimersByTime(150); });

      // Guard should still be active because user is dragging again
      Object.defineProperty(audio, 'currentTime', { value: 10, writable: true, configurable: true });
      act(() => { audio.dispatchEvent(new Event('timeupdate')); });
      // Should not update because isDragging is still true
      expect(getCtx().currentTime).toBe(50);
    });
  });

  // ── seekAndPlay ──

  describe('seekAndPlay()', () => {
    test('seeks and waits for seeked event before playing', () => {
      const { getCtx, audio } = renderWithPlayer();
      Object.defineProperty(audio, 'duration', { value: 300, writable: true, configurable: true });
      // Need a src for togglePlay to work
      audio.src = 'https://example.com/audio.mp3';

      act(() => { getCtx().seekAndPlay(120, true); });

      // Audio currentTime should be set
      expect(audio.currentTime).toBe(120);
      expect(getCtx().currentTime).toBe(120);

      // play() should NOT have been called yet (waiting for seeked)
      expect(audio.play).not.toHaveBeenCalled();

      // Simulate seeked event — listener was added via addEventListener
      expect(audio.addEventListener).toHaveBeenCalledWith('seeked', expect.any(Function), { once: true });

      // Fire the seeked callback
      const seekedCalls = audio.addEventListener.mock.calls.filter(c => c[0] === 'seeked');
      const lastSeekedCb = seekedCalls[seekedCalls.length - 1][1];
      act(() => { lastSeekedCb(); });

      // Now play() should have been called
      expect(audio.play).toHaveBeenCalled();
    });

    test('does not play if shouldPlay is false', () => {
      const { getCtx, audio } = renderWithPlayer();
      Object.defineProperty(audio, 'duration', { value: 300, writable: true, configurable: true });

      act(() => { getCtx().seekAndPlay(50, false); });

      expect(audio.currentTime).toBe(50);
      // No seeked listener should be added for play
      const seekedCalls = audio.addEventListener.mock.calls.filter(c => c[0] === 'seeked');
      expect(seekedCalls.length).toBe(0);
    });

    test('does not add seeked listener if already playing', () => {
      const { getCtx, audio } = renderWithPlayer();
      Object.defineProperty(audio, 'duration', { value: 300, writable: true, configurable: true });
      audio.src = 'https://example.com/audio.mp3';

      // Simulate playing state
      act(() => {
        audio.dispatchEvent(new Event('play'));
      });
      expect(getCtx().isPlaying).toBe(true);

      act(() => { getCtx().seekAndPlay(80, true); });

      // Should NOT add seeked listener because already playing
      const seekedCalls = audio.addEventListener.mock.calls.filter(c => c[0] === 'seeked');
      expect(seekedCalls.length).toBe(0);
    });
  });

  // ── togglePlay ──

  describe('togglePlay()', () => {
    test('does nothing if no audio source', () => {
      const { getCtx, audio } = renderWithPlayer();
      
      act(() => { getCtx().togglePlay(); });
      expect(audio.play).not.toHaveBeenCalled();
      expect(getCtx().isPlaying).toBe(false);
    });

    test('plays when paused', () => {
      const { getCtx, audio } = renderWithPlayer();
      audio.src = 'https://example.com/audio.mp3';

      act(() => { getCtx().togglePlay(); });
      expect(audio.play).toHaveBeenCalled();
    });

    test('pauses when playing', () => {
      const { getCtx, audio } = renderWithPlayer();
      audio.src = 'https://example.com/audio.mp3';

      // Start playing
      act(() => { audio.dispatchEvent(new Event('play')); });
      expect(getCtx().isPlaying).toBe(true);

      act(() => { getCtx().togglePlay(); });
      expect(audio.pause).toHaveBeenCalled();
      expect(getCtx().isPlaying).toBe(false);
    });
  });

  // ── playEpisode ──

  describe('playEpisode()', () => {
    const episode1 = { slug: 'ep-1', audioUrl: 'https://example.com/ep1.mp3', title: 'Episode 1' };
    const episode2 = { slug: 'ep-2', audioUrl: 'https://example.com/ep2.mp3', title: 'Episode 2' };

    test('loads and plays a new episode', async () => {
      const { getCtx, audio } = renderWithPlayer();

      await act(async () => { await getCtx().playEpisode(episode1, 0); });

      expect(audio.src).toBe('https://example.com/ep1.mp3');
      expect(audio.load).toHaveBeenCalled();
      expect(audio.play).toHaveBeenCalled();
      expect(getCtx().currentEpisode.slug).toBe('ep-1');
      expect(getCtx().isGlobalPlayerVisible).toBe(true);
    });

    test('loads with start time', async () => {
      const { getCtx, audio } = renderWithPlayer();

      await act(async () => { await getCtx().playEpisode(episode1, 60); });

      expect(audio.currentTime).toBe(60);
      expect(getCtx().currentTime).toBe(60);
    });

    test('same episode same audio just seeks', async () => {
      const { getCtx, audio } = renderWithPlayer();

      await act(async () => { await getCtx().playEpisode(episode1, 0); });
      audio.play.mockClear();
      audio.load.mockClear();

      // Same episode, different time
      Object.defineProperty(audio, 'duration', { value: 300, writable: true, configurable: true });
      await act(async () => { await getCtx().playEpisode(episode1, 60); });

      // Should NOT reload
      expect(audio.load).not.toHaveBeenCalled();
      // Should seek
      expect(audio.currentTime).toBe(60);
    });

    test('rejects episode without audio URL', async () => {
      const { getCtx, audio } = renderWithPlayer();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await act(async () => { await getCtx().playEpisode({ slug: 'no-audio' }, 0); });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No audio URL'));
      consoleSpy.mockRestore();
    });

    test('switches between episodes correctly', async () => {
      const { getCtx, audio } = renderWithPlayer();

      await act(async () => { await getCtx().playEpisode(episode1, 0); });
      expect(getCtx().currentEpisode.slug).toBe('ep-1');

      await act(async () => { await getCtx().playEpisode(episode2, 30); });
      expect(getCtx().currentEpisode.slug).toBe('ep-2');
      expect(audio.src).toBe('https://example.com/ep2.mp3');
      expect(audio.currentTime).toBe(30);
    });
  });

  // ── Playback rate ──

  describe('playback rate', () => {
    test('setPlaybackRate changes audio element rate', () => {
      const { getCtx, audio } = renderWithPlayer();

      act(() => { getCtx().setPlaybackRate(1.5); });
      expect(audio.playbackRate).toBe(1.5);
      expect(getCtx().playbackRate).toBe(1.5);
    });

    test('playback rate is applied when new episode loads', async () => {
      const { getCtx, audio } = renderWithPlayer();

      act(() => { getCtx().setPlaybackRate(2); });

      const episode = { slug: 'ep-rate', audioUrl: 'https://example.com/rate.mp3' };
      await act(async () => { await getCtx().playEpisode(episode, 0); });

      expect(audio.playbackRate).toBe(2);
    });
  });

  // ── Audio events ──

  describe('audio event handlers', () => {
    test('loadedmetadata sets duration', () => {
      const { getCtx, audio } = renderWithPlayer();
      Object.defineProperty(audio, 'duration', { value: 600, writable: true, configurable: true });

      act(() => { audio.dispatchEvent(new Event('loadedmetadata')); });
      expect(getCtx().duration).toBe(600);
    });

    test('ended stops playing', () => {
      const { getCtx, audio } = renderWithPlayer();

      // Start "playing"
      act(() => { audio.dispatchEvent(new Event('play')); });
      expect(getCtx().isPlaying).toBe(true);

      act(() => { audio.dispatchEvent(new Event('ended')); });
      expect(getCtx().isPlaying).toBe(false);
    });

    test('waiting sets loading, canplay clears it', () => {
      const { getCtx, audio } = renderWithPlayer();

      act(() => { audio.dispatchEvent(new Event('waiting')); });
      expect(getCtx().isLoading).toBe(true);

      act(() => { audio.dispatchEvent(new Event('canplay')); });
      expect(getCtx().isLoading).toBe(false);
    });

    test('play/pause events sync state', () => {
      const { getCtx, audio } = renderWithPlayer();

      act(() => { audio.dispatchEvent(new Event('play')); });
      expect(getCtx().isPlaying).toBe(true);

      act(() => { audio.dispatchEvent(new Event('pause')); });
      expect(getCtx().isPlaying).toBe(false);
    });
  });

  // ── closeGlobalPlayer ──

  test('closeGlobalPlayer resets everything', async () => {
    const { getCtx, audio } = renderWithPlayer();
    const episode = { slug: 'ep-close', audioUrl: 'https://example.com/close.mp3' };

    await act(async () => { await getCtx().playEpisode(episode, 0); });
    expect(getCtx().isGlobalPlayerVisible).toBe(true);

    act(() => { getCtx().closeGlobalPlayer(); });
    expect(getCtx().isGlobalPlayerVisible).toBe(false);
    expect(getCtx().isPlaying).toBe(false);
    expect(getCtx().currentEpisode).toBeNull();
    expect(audio.pause).toHaveBeenCalled();
  });

  // ── Rapid seek stress test ──

  describe('rapid seek stress', () => {
    test('10 rapid seeks settle on the last value', () => {
      const { getCtx, audio } = renderWithPlayer();
      Object.defineProperty(audio, 'duration', { value: 600, writable: true, configurable: true });

      act(() => {
        for (let i = 1; i <= 10; i++) {
          getCtx().seek(i * 10);
        }
      });

      expect(getCtx().currentTime).toBe(100);
      expect(audio.currentTime).toBe(100);

      // Timeupdate with stale values should be ignored
      Object.defineProperty(audio, 'currentTime', { value: 20, writable: true, configurable: true });
      act(() => { audio.dispatchEvent(new Event('timeupdate')); });
      expect(getCtx().currentTime).toBe(100);
    });
  });
});
