import { afterEach, describe, expect, it, vi } from 'vitest';
import { emit, on } from '../src/game/events.js';
import { state } from '../src/game/state.js';
import { clearScheduled, schedule, updateScheduled } from '../src/game/timers.js';
import { formatTime, moveToward, rotateToward } from '../src/game/util.js';

describe('util', () => {
  it('moveToward clamps the step and lands exactly on the target', () => {
    expect(moveToward(0, 10, 3)).toBe(3);
    expect(moveToward(9, 10, 3)).toBe(10);
    expect(moveToward(0, -10, 3)).toBe(-3);
  });

  it('rotateToward takes the short way around the circle', () => {
    const next = rotateToward(Math.PI - 0.1, -Math.PI + 0.1, 0.05);
    expect(next).toBeCloseTo(Math.PI - 0.05);
  });

  it('formatTime renders mm:ss and a placeholder for missing values', () => {
    expect(formatTime(105)).toBe('01:45');
    expect(formatTime(-3)).toBe('00:00');
    expect(formatTime(null)).toBe('--');
  });
});

describe('events', () => {
  it('delivers payloads to listeners until they unsubscribe', () => {
    const handler = vi.fn();
    const off = on('test', handler);
    emit('test', { a: 1 });
    off();
    emit('test', { a: 2 });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ a: 1 });
  });
});

describe('timers', () => {
  afterEach(() => {
    clearScheduled();
    state.mode = 'loading';
  });

  it('fires after the delay has elapsed in frame time', () => {
    const callback = vi.fn();
    state.mode = 'playing';
    schedule(1, callback);
    updateScheduled(0.6);
    expect(callback).not.toHaveBeenCalled();
    updateScheduled(0.5);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not advance while paused', () => {
    const callback = vi.fn();
    state.mode = 'paused';
    schedule(0.5, callback);
    updateScheduled(5);
    expect(callback).not.toHaveBeenCalled();
    state.mode = 'playing';
    updateScheduled(0.6);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('can be cancelled, and callbacks may schedule follow-ups', () => {
    const cancelled = vi.fn();
    const followUp = vi.fn();
    state.mode = 'playing';
    schedule(1, cancelled);
    clearScheduled();
    schedule(0.1, () => schedule(0.1, followUp));
    updateScheduled(0.2);
    updateScheduled(0.2);
    expect(cancelled).not.toHaveBeenCalled();
    expect(followUp).toHaveBeenCalledTimes(1);
  });
});
