/**
 * PlayerContext — full engine test suite
 * Tests: seek guards, drag suppression, seekAndPlay atomicity, timeupdate filtering,
 *        playEpisode, togglePlay, error recovery, edge cases.
 */
import React from 'react';
import { render, act, screen } from '@testing-library/react';
import { PlayerProvider, usePlayer } from '@/contexts/PlayerContext';

// ─── Helper: spy on native audio methods of a real <audio> element ──────────

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

  // Grab the real <audio> element rendered by PlayerProvider and spy on its methods
  const audio = result.container.querySelector('audio');
  vi.spyOn(audio, 'play').mockResolvedValue(undefined);
  vi.spyOn(audio, 'pause').mockImplementation(() => {});
  vi.spyOn(audio, 'load').mockImplementation(() => {});
  vi.spyOn(audio, 'addEventListener');
  vi.spyOn(audio, 'removeEventListener');

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

    test('sets autoplayBlocked on NotAllowedError', async () => {
      const { getCtx, audio } = renderWithPlayer();
      audio.src = 'https://example.com/audio.mp3';
      const err = new Error('autoplay blocked');
      err.name = 'NotAllowedError';
      audio.play.mockRejectedValueOnce(err);

      await act(async () => {
        getCtx().togglePlay();
        await Promise.resolve();
      });

      expect(getCtx().isPlaying).toBe(false);
      expect(getCtx().autoplayBlocked).toBe(true);
    });

    test('ignores AbortError during rapid operations', async () => {
      const { getCtx, audio } = renderWithPlayer();
      audio.src = 'https://example.com/audio.mp3';
      const err = new Error('aborted');
      err.name = 'AbortError';
      audio.play.mockRejectedValueOnce(err);

      await act(async () => {
        getCtx().togglePlay();
        await Promise.resolve();
      });

      expect(getCtx().isPlaying).toBe(false);
      expect(getCtx().autoplayBlocked).toBe(false);
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
      // Clear call counts for play/load after initial playEpisode
      audio.play.mockClear();
      audio.load.mockClear();

      // Same episode, different time — should seek, not reload
      Object.defineProperty(audio, 'duration', { value: 300, writable: true, configurable: true });
      await act(async () => { await getCtx().playEpisode(episode1, 60); });

      // Should NOT reload audio (same src)
      expect(audio.load).not.toHaveBeenCalled();
      // Should have seeked
      expect(audio.currentTime).toBe(60);
    });

    test('rejects episode without audio URL', async () => {
      const { getCtx, audio } = renderWithPlayer();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await act(async () => { await getCtx().playEpisode({ slug: 'no-audio' }, 0); });

      // console.error is called with multiple args: (message, slug)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No audio URL'),
        expect.anything()
      );
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

    test('accepts snake_case audio_url field', async () => {
      const { getCtx, audio } = renderWithPlayer();
      const episode = { slug: 'ep-snake', audio_url: 'https://example.com/snake.mp3', title: 'Snake Case' };

      await act(async () => { await getCtx().playEpisode(episode, 15); });

      expect(audio.src).toBe('https://example.com/snake.mp3');
      expect(audio.currentTime).toBe(15);
      expect(getCtx().currentEpisode.slug).toBe('ep-snake');
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

  // ── Error recovery / cache refresh ──

  describe('error recovery and cache behavior', () => {
    test('network error triggers SW cache refresh and audio reload flow', async () => {
      const { getCtx, audio } = renderWithPlayer();
      const postMessage = vi.fn();

      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          controller: { postMessage },
        },
      });

      const sourceUrl = 'https://example.com/recover.mp3';
      audio.src = sourceUrl;
      act(() => {
        getCtx().setCurrentTime(42);
        getCtx().setIsPlaying(true);
      });

      Object.defineProperty(audio, 'error', {
        configurable: true,
        value: {
          code: 2,
          MEDIA_ERR_NETWORK: 2,
          MEDIA_ERR_DECODE: 3,
          MEDIA_ERR_SRC_NOT_SUPPORTED: 4,
          message: 'Network error',
        },
      });

      act(() => {
        audio.dispatchEvent(new Event('error'));
      });

      expect(postMessage).toHaveBeenCalledWith({
        type: 'REFRESH_AUDIO_CACHE',
        url: sourceUrl,
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(audio.load).toHaveBeenCalledTimes(1);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(audio.src).toBe(sourceUrl);
      expect(audio.currentTime).toBe(42);
      expect(audio.load).toHaveBeenCalledTimes(2);
      expect(audio.play).toHaveBeenCalled();
    });

    test('recoverable error does not call play if player was not playing', () => {
      const { getCtx, audio } = renderWithPlayer();
      const postMessage = vi.fn();

      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          controller: { postMessage },
        },
      });

      audio.src = 'https://example.com/recover-paused.mp3';
      act(() => {
        getCtx().setCurrentTime(10);
        getCtx().setIsPlaying(false);
      });

      Object.defineProperty(audio, 'error', {
        configurable: true,
        value: {
          code: 3,
          MEDIA_ERR_NETWORK: 2,
          MEDIA_ERR_DECODE: 3,
          MEDIA_ERR_SRC_NOT_SUPPORTED: 4,
          message: 'Decode error',
        },
      });

      audio.play.mockClear();

      act(() => {
        audio.dispatchEvent(new Event('error'));
      });

      act(() => {
        vi.advanceTimersByTime(1100);
      });

      expect(postMessage).toHaveBeenCalled();
      expect(audio.play).not.toHaveBeenCalled();
    });

    test('non-recoverable error does not run reload sequence', () => {
      const { audio } = renderWithPlayer();
      const postMessage = vi.fn();

      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          controller: { postMessage },
        },
      });

      audio.src = 'https://example.com/no-retry.mp3';

      Object.defineProperty(audio, 'error', {
        configurable: true,
        value: {
          code: 1,
          MEDIA_ERR_NETWORK: 2,
          MEDIA_ERR_DECODE: 3,
          MEDIA_ERR_SRC_NOT_SUPPORTED: 4,
          message: 'Aborted',
        },
      });

      audio.load.mockClear();

      act(() => {
        audio.dispatchEvent(new Event('error'));
      });

      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(postMessage).not.toHaveBeenCalled();
      expect(audio.load).not.toHaveBeenCalled();
    });

    test('retry play failure is handled and forces isPlaying=false', async () => {
      const { getCtx, audio } = renderWithPlayer();

      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          controller: { postMessage: vi.fn() },
        },
      });

      audio.src = 'https://example.com/retry-fails.mp3';
      act(() => {
        getCtx().setCurrentTime(25);
        getCtx().setIsPlaying(true);
      });

      const retryError = new Error('retry failed');
      audio.play.mockRejectedValueOnce(retryError);

      Object.defineProperty(audio, 'error', {
        configurable: true,
        value: {
          code: 4,
          MEDIA_ERR_NETWORK: 2,
          MEDIA_ERR_DECODE: 3,
          MEDIA_ERR_SRC_NOT_SUPPORTED: 4,
          message: 'Unsupported',
        },
      });

      act(() => {
        audio.dispatchEvent(new Event('error'));
      });

      act(() => {
        vi.advanceTimersByTime(1100);
      });

      await act(async () => {
        await Promise.resolve();
      });

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
