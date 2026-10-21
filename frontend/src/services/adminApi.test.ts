import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminApi } from './adminApi';
import type { VehicleSaveRequest } from '../types/admin';

const fetch = vi.fn<typeof globalThis.fetch>();

beforeEach(() => {
  fetch.mockReset();
  vi.stubGlobal('fetch', fetch);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('permanent vehicle deletion', () => {
  it('sends DELETE with the session cookie and accepts an empty 204', async () => {
    fetch.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(adminApi.deleteVehicle('v1')).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith('/api/admin/vehicles/v1', {
      method: 'DELETE', credentials: 'include', headers: { Accept: 'application/json' },
    });
  });

  it('preserves a failed deletion for the caller to display', async () => {
    fetch.mockResolvedValue(new Response(JSON.stringify({ code: 'csrf_failed' }), { status: 403 }));
    await expect(adminApi.deleteVehicle('v1')).rejects.toMatchObject({ status: 403, code: 'csrf_failed' });
  });
});

describe('video upload contracts', () => {
  it('requests a video upload with its MIME type, size and caller-owned idempotency key', async () => {
    const answer = { videoId: 'video1', uploadUrl: 'https://s3/put', expiresInSeconds: 900 };
    fetch.mockResolvedValue(new Response(JSON.stringify(answer)));
    const file = new File(['mp4'], 'car.mp4', { type: 'video/mp4' });

    expect(await adminApi.videoIntent('v1', file, 'upload-key')).toEqual(answer);
    expect(fetch).toHaveBeenCalledWith('/api/admin/vehicles/v1/video/intent', {
      method: 'POST', body: JSON.stringify({ mimeType: 'video/mp4', sizeBytes: 3 }), credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'Idempotency-Key': 'upload-key' },
    });
  });

  it('completes a video with the supplied idempotency key', async () => {
    const answer = { videoId: 'video1', state: 'Ready' };
    fetch.mockResolvedValue(new Response(JSON.stringify(answer)));

    expect(await adminApi.completeVideo('v1', 'video1', 'upload-key')).toEqual(answer);
    expect(fetch).toHaveBeenCalledWith('/api/admin/vehicles/v1/video/video1/complete', {
      method: 'POST', credentials: 'include', headers: { Accept: 'application/json', 'Idempotency-Key': 'upload-key' },
    });
  });

  it('uploads a poster through the image intent with its video association', async () => {
    fetch.mockResolvedValue(new Response('{}'));
    await adminApi.imageIntent('v1', new File(['jpg'], 'poster.jpg', { type: 'image/jpeg' }), 'poster-key', true, { videoId: 'video1' });

    expect(fetch).toHaveBeenCalledWith('/api/admin/vehicles/v1/images/intent', {
      method: 'POST', credentials: 'include',
      body: JSON.stringify({ mimeType: 'image/jpeg', sizeBytes: 3, staged: true, kind: 'videoPoster', videoId: 'video1' }),
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'Idempotency-Key': 'poster-key' },
    });
  });

  it.each([true, false])('preserves photo intents without poster fields (staged: %s)', async (staged) => {
    fetch.mockResolvedValue(new Response('{}'));
    await adminApi.imageIntent('v1', new File(['jpg'], 'car.jpg', { type: 'image/jpeg' }), 'photo-key', staged);

    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toEqual({ mimeType: 'image/jpeg', sizeBytes: 3, staged });
  });
});

describe('saving video selection', () => {
  const bodies: VehicleSaveRequest[] = [{}, { video: { keep: null } }, { video: { keep: 'video1' } }];
  it.each(bodies)('preserves the save body %j', async (body) => {
    fetch.mockResolvedValue(new Response('{}'));
    await adminApi.saveVehicle('v1', body);

    expect(fetch).toHaveBeenCalledWith('/api/admin/vehicles/v1/save', expect.objectContaining({
      method: 'POST', body: JSON.stringify(body),
    }));
  });
});
