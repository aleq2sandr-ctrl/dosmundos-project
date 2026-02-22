/**
 * usePlayerInteractions — tests hash parsing, handleSeekToTime, 
 * floating controls, double-trigger prevention
 */
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import usePlayerInteractions from '@/hooks/player_page/usePlayerInteractions';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
let mockLocation = { pathname: '/ru/episodes/test-ep', hash: '', search: '', state: null };

vi.mock('react-router-dom', () => ({
  useLocation: () => mockLocation,
  useNavigate: () => mockNavigate,
}));

const mockSeek = vi.fn();
const mockSeekAndPlay = vi.fn();
const mockTogglePlay = vi.fn();

vi.mock('@/contexts/PlayerContext', () => ({
  usePlayer: () => ({
    seek: mockSeek,
    seekAndPlay: mockSeekAndPlay,
    togglePlay: mockTogglePlay,
    isPlaying: false,
    currentTime: 0,
    duration: 300,
  }),
}));

vi.mock('@/lib/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function mockAudioRef(currentTime = 0) {
  return {
    current: {
      currentTime,
      duration: 300,
      paused: true,
      play: vi.fn(async () => {}),
      pause: vi.fn(),
    },
  };
}

const sampleQuestions = [
  { id: 'q1', slug: 'intro', title: 'Intro', time: 0 },
  { id: 'q2', slug: 'first-question', title: 'Question 1', time: 60 },
  { id: 'q3', slug: 'second-question', title: 'Question 2', time: 180 },
];

function renderInteractions(options = {}) {
  const {
    hash = '',
    questions = sampleQuestions,
    episodeSlug = 'test-ep',
    initialShowTranscript = false,
  } = options;

  mockLocation = { pathname: '/ru/episodes/' + episodeSlug, hash, search: '', state: null };

  const audioRef = mockAudioRef(0);
  const controlsRef = { current: null };

  return renderHook(() =>
    usePlayerInteractions(audioRef, controlsRef, episodeSlug, questions, initialShowTranscript)
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('usePlayerInteractions', () => {

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockNavigate.mockClear();
    mockSeek.mockClear();
    mockSeekAndPlay.mockClear();
    mockTogglePlay.mockClear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── Hash parsing ──

  describe('hash parsing', () => {
    test('compact seconds format: #123', () => {
      const { result } = renderInteractions({ hash: '#123' });
      
      expect(result.current.jumpDetails.time).toBe(123);
      expect(result.current.jumpDetails.playAfterJump).toBe(true);
      expect(result.current.jumpDetails.segmentToHighlight).toBe(123000);
    });

    test('compact mm:ss format: #2:30', () => {
      const { result } = renderInteractions({ hash: '#2:30' });
      
      expect(result.current.jumpDetails.time).toBe(150); // 2*60 + 30
      expect(result.current.jumpDetails.playAfterJump).toBe(true);
    });

    test('segment format: #segment-5000', () => {
      const { result } = renderInteractions({ hash: '#segment-5000' });
      
      expect(result.current.jumpDetails.time).toBe(5); // 5000ms / 1000
      expect(result.current.jumpDetails.playAfterJump).toBe(false);
    });

    test('segment format with play: #segment-5000&play=true', () => {
      const { result } = renderInteractions({ hash: '#segment-5000&play=true' });
      
      expect(result.current.jumpDetails.time).toBe(5);
      expect(result.current.jumpDetails.playAfterJump).toBe(true);
    });

    test('question format: #question-q2', () => {
      const { result } = renderInteractions({ hash: '#question-q2' });
      
      expect(result.current.jumpDetails.time).toBe(60); // q2 time
      expect(result.current.jumpDetails.questionId).toBe('q2');
    });

    test('question format with slug: #question-first-question', () => {
      const { result } = renderInteractions({ hash: '#question-first-question' });
      
      expect(result.current.jumpDetails.time).toBe(60);
      expect(result.current.jumpDetails.questionId).toBe('first-question');
    });

    test('no hash triggers autoplay from start', () => {
      const { result } = renderInteractions({ hash: '' });
      
      expect(result.current.jumpDetails.time).toBe(0);
      expect(result.current.jumpDetails.playAfterJump).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('#0'),
        expect.objectContaining({ replace: true })
      );
    });

    test('autoplay from start only happens once', () => {
      const { result, rerender } = renderInteractions({ hash: '' });
      
      const navigateCount = mockNavigate.mock.calls.length;
      
      // Re-render should not trigger again
      rerender();
      expect(mockNavigate.mock.calls.length).toBe(navigateCount);
    });

    test('invalid hash keeps jumpDetails untouched', () => {
      const { result } = renderInteractions({ hash: '#invalid-format' });

      expect(result.current.jumpDetails.time).toBeNull();
      expect(result.current.jumpDetails.questionId).toBeNull();
      expect(result.current.jumpDetails.playAfterJump).toBe(false);
    });

    test('unknown question hash does not set jumpDetails after retry timeout', () => {
      const { result } = renderInteractions({
        hash: '#question-missing-question',
        questions: sampleQuestions,
      });

      act(() => {
        vi.advanceTimersByTime(700);
      });

      expect(result.current.jumpDetails.time).toBeNull();
      expect(result.current.jumpDetails.questionId).toBeNull();
    });
  });

  // ── handleSeekToTime ──

  describe('handleSeekToTime', () => {
    test('performs seek directly via PlayerContext', () => {
      const { result } = renderInteractions({ hash: '#0' });
      
      act(() => {
        result.current.handleSeekToTime(120, 'question-q2', false);
      });

      expect(mockSeek).toHaveBeenCalledWith(120);
      expect(mockSeekAndPlay).not.toHaveBeenCalled();
    });

    test('performs seekAndPlay when playAfterJump is true', () => {
      const { result } = renderInteractions({ hash: '#0' });
      
      act(() => {
        result.current.handleSeekToTime(120, 'question-q2', true);
      });

      expect(mockSeekAndPlay).toHaveBeenCalledWith(120, true);
      expect(mockSeek).not.toHaveBeenCalled();
    });

    test('updates jumpDetails for UI highlighting', () => {
      const { result } = renderInteractions({ hash: '#0' });
      
      act(() => {
        result.current.handleSeekToTime(60, 'question-q2', true, 'q2');
      });

      expect(result.current.jumpDetails.time).toBe(60);
      expect(result.current.jumpDetails.questionId).toBe('q2');
      expect(result.current.jumpDetails.playAfterJump).toBe(true);
      expect(result.current.jumpDetails.segmentToHighlight).toBe(60000);
    });

    test('debounces URL hash updates', () => {
      const { result } = renderInteractions({ hash: '#0' });
      
      // Multiple rapid seeks
      act(() => {
        result.current.handleSeekToTime(10, null, false);
        result.current.handleSeekToTime(20, null, false);
        result.current.handleSeekToTime(30, null, false);
      });

      // Hash should not have been updated yet (debounced 150ms)
      const hashCalls = mockNavigate.mock.calls.filter(c => 
        typeof c[0] === 'string' && c[0].includes('#')
      );
      // Only the initial #0 from setup
      
      // Advance past debounce
      act(() => { vi.advanceTimersByTime(200); });

      // Now should have fired with the LAST value (#30)
      const allCalls = mockNavigate.mock.calls;
      const lastCall = allCalls[allCalls.length - 1];
      expect(lastCall[0]).toContain('#30');
    });

    test('does not re-trigger hash processing for own hashes', () => {
      const { result } = renderInteractions({ hash: '#0' });
      
      // Perform a seek
      act(() => {
        result.current.handleSeekToTime(120, 'q2', true);
      });

      // The seek should have been performed directly
      expect(mockSeekAndPlay).toHaveBeenCalledTimes(1);

      // Even if location.hash now changes to #120, it should not re-trigger
      // because lastSetHashRef tracks it
    });

    test('does not navigate when seek target hash is already current hash', () => {
      const { result } = renderInteractions({ hash: '#120' });

      mockNavigate.mockClear();

      act(() => {
        result.current.handleSeekToTime(120, null, false);
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockSeek).toHaveBeenCalledWith(120);
    });
  });

  // ── Floating player controls ──

  describe('floating player controls', () => {
    test('handleFloatingPlayPause uses PlayerContext.togglePlay', () => {
      const { result } = renderInteractions({ hash: '#0' });
      
      act(() => { result.current.handleFloatingPlayPause(); });
      
      expect(mockTogglePlay).toHaveBeenCalledTimes(1);
    });

    test('handleFloatingPlayerSkip uses PlayerContext.seek', () => {
      const audioRef = mockAudioRef(100);
      const controlsRef = { current: null };
      mockLocation = { pathname: '/ru/episodes/test-ep', hash: '#0', search: '', state: null };

      const { result } = renderHook(() =>
        usePlayerInteractions(audioRef, controlsRef, 'test-ep', sampleQuestions, false)
      );

      act(() => { result.current.handleFloatingPlayerSkip(10); });
      expect(mockSeek).toHaveBeenCalledWith(110); // 100 + 10

      mockSeek.mockClear();
      act(() => { result.current.handleFloatingPlayerSkip(-10); });
      expect(mockSeek).toHaveBeenCalledWith(90); // 100 - 10
    });

    test('handleFloatingPlayerSkip clamps to 0', () => {
      const audioRef = mockAudioRef(5);
      const controlsRef = { current: null };
      mockLocation = { pathname: '/ru/episodes/test-ep', hash: '#0', search: '', state: null };

      const { result } = renderHook(() =>
        usePlayerInteractions(audioRef, controlsRef, 'test-ep', sampleQuestions, false)
      );

      act(() => { result.current.handleFloatingPlayerSkip(-30); });
      expect(mockSeek).toHaveBeenCalledWith(0); // Math.max(0, 5-30) = 0
    });

    test('handleFloatingPlayerSkip does nothing when audioRef.current is missing', () => {
      const audioRef = { current: null };
      const controlsRef = { current: null };
      mockLocation = { pathname: '/ru/episodes/test-ep', hash: '#0', search: '', state: null };

      const { result } = renderHook(() =>
        usePlayerInteractions(audioRef, controlsRef, 'test-ep', sampleQuestions, false)
      );

      mockSeek.mockClear();

      act(() => {
        result.current.handleFloatingPlayerSkip(15);
      });

      expect(mockSeek).not.toHaveBeenCalled();
    });
  });

  // ── Transcript toggle ──

  describe('transcript UI toggle', () => {
    test('toggles and persists to localStorage', () => {
      const { result } = renderInteractions({ hash: '#0', initialShowTranscript: false });
      
      expect(result.current.showTranscriptUI).toBe(false);

      act(() => { result.current.handleToggleShowTranscript(); });
      expect(result.current.showTranscriptUI).toBe(true);
      expect(localStorage.getItem('showTranscriptUI')).toBe('true');

      act(() => { result.current.handleToggleShowTranscript(); });
      expect(result.current.showTranscriptUI).toBe(false);
      expect(localStorage.getItem('showTranscriptUI')).toBe('false');
    });

    test('reads initial value from localStorage', () => {
      localStorage.setItem('showTranscriptUI', 'true');
      const { result } = renderInteractions({ hash: '#0', initialShowTranscript: false });
      
      expect(result.current.showTranscriptUI).toBe(true);
    });
  });
});
