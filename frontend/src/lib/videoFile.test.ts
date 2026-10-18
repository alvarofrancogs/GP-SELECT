import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BITRATE_WARNING_MBPS, MAX_VIDEO_BYTES, POSTER_TIMEOUT_MS, UnreadableVideoError, VIDEO_TYPE, bitrateMbps, extractPoster, isFastStart,
} from './videoFile';

function box(type: string, size = 16): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(size);
  new DataView(bytes.buffer).setUint32(0, size);
  bytes.set(Array.from(type, (character) => character.charCodeAt(0)), 4);
  return bytes;
}

function largeBox(type: string, size = 24): Uint8Array<ArrayBuffer> {
  const bytes = box(type, size);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 1);
  view.setBigUint64(8, BigInt(size));
  return bytes;
}

function mp4(...boxes: Uint8Array<ArrayBuffer>[]): Blob {
  return new Blob(boxes, { type: 'video/mp4' });
}

describe('video limits', () => {
  it('exports the agreed upload and bitrate limits', () => {
    expect(MAX_VIDEO_BYTES).toBe(100 * 1024 * 1024);
    expect(VIDEO_TYPE).toBe('video/mp4');
    expect(BITRATE_WARNING_MBPS).toBe(10);
  });
});

describe('isFastStart', () => {
  it('fast start when moov comes before mdat', async () => {
    expect(await isFastStart(mp4(box('ftyp', 24), box('moov'), box('mdat')))).toBe(true);
  });

  it('not fast start when mdat comes first', async () => {
    expect(await isFastStart(mp4(box('ftyp', 24), box('mdat'), box('moov')))).toBe(false);
  });

  it('reads 64-bit box sizes', async () => {
    expect(await isFastStart(mp4(box('ftyp', 24), largeBox('mdat'), box('moov')))).toBe(false);
  });

  it('jumps past a box with a 64-bit size', async () => {
    expect(await isFastStart(mp4(box('ftyp', 24), largeBox('free'), box('moov')))).toBe(true);
  });

  it('null for a non-MP4 blob', async () => {
    expect(await isFastStart(new Blob(['This is not an MP4.']))).toBeNull();
  });

  it('returns null when neither moov nor mdat is present', async () => {
    expect(await isFastStart(mp4(box('ftyp', 24), box('free')))).toBeNull();
  });

  it.each([['moov', true], ['mdat', false]] as const)(
    'accepts a zero-size %s box extending to the end', async (type, expected) => {
      const bytes = box(type);
      new DataView(bytes.buffer).setUint32(0, 0);
      expect(await isFastStart(mp4(box('ftyp', 24), bytes))).toBe(expected);
    },
  );

  it('does not read nested boxes inside a zero-size box', async () => {
    const bytes = box('free', 24);
    new DataView(bytes.buffer).setUint32(0, 0);
    bytes.set(box('moov'), 8);
    expect(await isFastStart(mp4(box('ftyp', 24), bytes))).toBeNull();
  });

  it.each([0, 7])('returns null for a truncated header (%i bytes)', async (length) => {
    expect(await isFastStart(new Blob([new Uint8Array(length)]))).toBeNull();
  });

  it.each([2, 7, 32])('rejects an invalid declared box size (%i)', async (size) => {
    const bytes = box('moov');
    new DataView(bytes.buffer).setUint32(0, size);
    expect(await isFastStart(mp4(bytes))).toBeNull();
  });

  it('rejects a truncated 64-bit header', async () => {
    expect(await isFastStart(mp4(largeBox('moov').slice(0, 12)))).toBeNull();
  });

  it.each([8n, BigInt(Number.MAX_SAFE_INTEGER) + 1n])(
    'rejects an invalid 64-bit size (%s)', async (size) => {
      const bytes = largeBox('moov');
      new DataView(bytes.buffer).setBigUint64(8, size);
      expect(await isFastStart(mp4(bytes))).toBeNull();
    },
  );

  it('examines the 64th box', async () => {
    const padding = Array.from({ length: 63 }, () => box('free', 8));
    expect(await isFastStart(mp4(...padding, box('moov')))).toBe(true);
  });

  it('stops after 64 boxes', async () => {
    const padding = Array.from({ length: 64 }, () => box('free', 8));
    const file = mp4(...padding, box('moov'));
    const slice = vi.spyOn(file, 'slice');
    expect(await isFastStart(file)).toBeNull();
    expect(slice).toHaveBeenCalledTimes(64);
  });

  it('reads only headers and skips payloads', async () => {
    const file = mp4(box('ftyp', 24), largeBox('free', 1024), box('mdat', 4096));
    const slice = vi.spyOn(file, 'slice');
    const readWholeFile = vi.spyOn(file, 'arrayBuffer');
    expect(await isFastStart(file)).toBe(false);
    expect(readWholeFile).not.toHaveBeenCalled();
    expect(slice.mock.calls).toEqual([[0, 8], [24, 32], [32, 40], [1048, 1056]]);
  });

  it('returns null if a header cannot be read', async () => {
    const file = mp4(box('moov'));
    vi.spyOn(file, 'slice').mockImplementation(() => { throw new Error('Read failed'); });
    expect(await isFastStart(file)).toBeNull();
  });
});

describe('bitrateMbps', () => {
  it('calculates decimal megabits per second', () => {
    expect(bitrateMbps(12_500_000, 10)).toBe(10);
  });

  it.each([0, -1, NaN, Infinity, -Infinity])('returns null for duration %s', (duration) => {
    expect(bitrateMbps(1, duration)).toBeNull();
  });
});

describe('extractPoster', () => {
  function start() {
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = vi.fn(() => 'blob:video');
      static revokeObjectURL = vi.fn();
    });
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    const create = vi.spyOn(document, 'createElement');
    const promise = extractPoster(new File(['mp4'], 'car.mp4', { type: 'video/mp4' }));
    const video = create.mock.results.find((result) => result.value instanceof HTMLVideoElement)!.value as HTMLVideoElement;
    return { promise, video };
  }
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('rejects as unreadable when the browser cannot load the file', async () => {
    const { promise, video } = start();
    video.dispatchEvent(new Event('error'));
    await expect(promise).rejects.toBeInstanceOf(UnreadableVideoError);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:video');
  });

  it('rejects as unreadable when the first frame has no dimensions', async () => {
    const { promise, video } = start();
    video.dispatchEvent(new Event('loadeddata'));
    video.dispatchEvent(new Event('seeked'));
    await expect(promise).rejects.toBeInstanceOf(UnreadableVideoError);
  });

  it('rejects as unreadable when the file never loads', async () => {
    vi.useFakeTimers();
    const { promise, video } = start();
    const rejected = expect(promise).rejects.toBeInstanceOf(UnreadableVideoError);
    await vi.advanceTimersByTimeAsync(POSTER_TIMEOUT_MS - 1);
    expect(video.onerror).not.toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    await rejected;
    expect(video.onerror).toBeNull();
  });
});
