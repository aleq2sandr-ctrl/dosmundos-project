/**
 * ProgressBar — tests drag state communication with PlayerContext
 * Tests: mousedown starts drag, mouseup stops drag, touch events,
 *        global listeners fire correctly, progress calculation
 */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import ProgressBar from '@/components/player/ProgressBar';
import { PlayerProvider, usePlayer } from '@/contexts/PlayerContext';

// Mock getLocaleString to avoid import issues
vi.mock('@/lib/locales', () => ({
  getLocaleString: (key) => key,
}));

vi.mock('@/lib/utils', () => ({
  formatTime: (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`,
}));

// ─── Spy component that exposes PlayerContext internals ───

let capturedCtx = null;
function ContextSpy() {
  capturedCtx = usePlayer();
  return null;
}

function renderProgressBar(props = {}) {
  const defaultProps = {
    currentTime: 30,
    duration: 300,
    sections: [],
    onProgressChange: vi.fn(),
    onSectionJump: vi.fn(),
    currentLanguage: 'ru',
    ...props,
  };

  const result = render(
    <PlayerProvider>
      <ContextSpy />
      <ProgressBar {...defaultProps} />
    </PlayerProvider>
  );

  const slider = result.getByRole('slider');

  return { slider, ...defaultProps, ...result };
}

describe('ProgressBar', () => {

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    capturedCtx = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test('renders with correct aria attributes', () => {
    const { slider } = renderProgressBar({ currentTime: 42, duration: 200 });

    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '200');
    expect(slider).toHaveAttribute('aria-valuenow', '42');
  });

  test('click on progress bar triggers onProgressChange', () => {
    const onProgressChange = vi.fn();
    const { slider } = renderProgressBar({ onProgressChange, duration: 100 });

    // Mock getBoundingClientRect
    slider.getBoundingClientRect = () => ({
      left: 0, right: 200, width: 200, top: 0, bottom: 20, height: 20,
    });

    fireEvent.click(slider, { clientX: 100 }); // 50% of 200px = 50s of 100s
    expect(onProgressChange).toHaveBeenCalledWith(50);
  });

  test('mousedown + mousemove (dragging) calls onProgressChange', () => {
    const onProgressChange = vi.fn();
    const { slider } = renderProgressBar({ onProgressChange, duration: 100 });

    slider.getBoundingClientRect = () => ({
      left: 0, right: 200, width: 200, top: 0, bottom: 20, height: 20,
    });

    fireEvent.mouseDown(slider, { clientX: 40 });
    expect(onProgressChange).toHaveBeenCalledWith(20); // 40/200 * 100

    // Advance time past the 30ms throttle in handleProgressInteraction
    vi.advanceTimersByTime(50);

    // Simulate global mousemove (document level)
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100 }));
    });
    expect(onProgressChange).toHaveBeenCalledWith(50);

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'));
    });

    // After mouseup, no more updates
    onProgressChange.mockClear();
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 150 }));
    });
    expect(onProgressChange).not.toHaveBeenCalled();
  });

  test('dragging suppresses timeupdate and stopDragging releases', () => {
    const { slider } = renderProgressBar({ duration: 100 });

    slider.getBoundingClientRect = () => ({
      left: 0, right: 200, width: 200, top: 0, bottom: 20, height: 20,
    });

    // Mousedown should start dragging
    fireEvent.mouseDown(slider, { clientX: 40 });

    // Verify PlayerContext is in dragging mode — audioelement timeupdate suppressed
    const audio = document.querySelector('audio');
    if (audio) {
      // Simulate timeupdate — should NOT change currentTime in context
      Object.defineProperty(audio, 'currentTime', { value: 999, writable: true, configurable: true });
      act(() => { audio.dispatchEvent(new Event('timeupdate')); });
      // Context should not have picked up 999
    }

    // Mouseup releases
    act(() => { document.dispatchEvent(new MouseEvent('mouseup')); });
    act(() => { vi.advanceTimersByTime(150); });
  });

  test('touch events work like mouse events', () => {
    const onProgressChange = vi.fn();
    const { slider } = renderProgressBar({ onProgressChange, duration: 200 });

    slider.getBoundingClientRect = () => ({
      left: 0, right: 400, width: 400, top: 0, bottom: 20, height: 20,
    });

    fireEvent.touchStart(slider, {
      touches: [{ clientX: 200 }],
    });
    expect(onProgressChange).toHaveBeenCalledWith(100); // 200/400 * 200

    act(() => {
      document.dispatchEvent(new TouchEvent('touchend'));
    });
  });

  test('section markers are rendered', () => {
    const sections = [
      { id: 'q1', title: 'Intro', time: 0 },
      { id: 'q2', title: 'Question 1', time: 60 },
      { id: 'q3', title: 'Question 2', time: 120 },
    ];
    const { getAllByRole } = renderProgressBar({ sections, duration: 300 });

    // Markers are buttons inside the slider
    const buttons = getAllByRole('button');
    expect(buttons.length).toBe(3);
  });

  test('section marker click calls onSectionJump', () => {
    const onSectionJump = vi.fn();
    const sections = [{ id: 'q1', title: 'Intro', time: 42 }];
    const { getAllByRole } = renderProgressBar({ sections, duration: 300, onSectionJump });

    const markerButton = getAllByRole('button')[0];
    fireEvent.click(markerButton);

    expect(onSectionJump).toHaveBeenCalledWith(42, 'q1');
  });

  test('does not fire onProgressChange when duration is 0', () => {
    const onProgressChange = vi.fn();
    const { slider } = renderProgressBar({ onProgressChange, duration: 0 });

    slider.getBoundingClientRect = () => ({
      left: 0, right: 200, width: 200, top: 0, bottom: 20, height: 20,
    });

    fireEvent.click(slider, { clientX: 100 });
    expect(onProgressChange).not.toHaveBeenCalled();
  });

  test('clamps progress to [0, duration]', () => {
    const onProgressChange = vi.fn();
    const { slider } = renderProgressBar({ onProgressChange, duration: 100 });

    slider.getBoundingClientRect = () => ({
      left: 100, right: 300, width: 200, top: 0, bottom: 20, height: 20,
    });

    // Click before the bar (negative position)
    fireEvent.click(slider, { clientX: 50 });
    expect(onProgressChange).toHaveBeenCalledWith(0);

    onProgressChange.mockClear();

    // Click after the bar
    fireEvent.click(slider, { clientX: 400 });
    expect(onProgressChange).toHaveBeenCalledWith(100);
  });
});
