import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const refresh = vi.hoisted(() => vi.fn());
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: { refresh } }));

import { scheduleScrollRefresh } from './scrollRefresh';

describe('scheduleScrollRefresh', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    refresh.mockReset();
    document.documentElement.className = '';
  });

  it('coalesces requests into one safe refresh, which waits for a scroll in progress to end', () => {
    scheduleScrollRefresh();
    scheduleScrollRefresh();
    vi.advanceTimersByTime(200);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith(true);
  });

  it('waits for the language fade: a refresh re-inserts the pins and restarted the lettering fade', () => {
    document.documentElement.classList.add('lang-in');
    scheduleScrollRefresh();
    vi.advanceTimersByTime(1000);
    expect(refresh).not.toHaveBeenCalled();
    document.documentElement.classList.remove('lang-in');
    vi.advanceTimersByTime(200);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
