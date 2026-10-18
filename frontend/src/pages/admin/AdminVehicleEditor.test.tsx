import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AdminVehicleEditor } from './AdminVehicleEditor';
import { adminApi, ApiError, uploadFile } from '../../services/adminApi';
import { extractPoster, isFastStart } from '../../lib/videoFile';
import { adminCopy } from '../../i18n/adminCopy';
import type { AdminImage, AdminVehicle } from '../../types/admin';

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return { ...actual, uploadFile: vi.fn(), adminApi: {
    getVehicle: vi.fn(), removeImage: vi.fn(), saveVehicle: vi.fn(),
    videoIntent: vi.fn(), completeVideo: vi.fn(), imageIntent: vi.fn(), completeImage: vi.fn(),
  } };
});

vi.mock('../../lib/videoFile', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../lib/videoFile')>(), extractPoster: vi.fn(), isFastStart: vi.fn(),
}));

const getVehicle = vi.mocked(adminApi.getVehicle);
const removeImage = vi.mocked(adminApi.removeImage);
const saveVehicle = vi.mocked(adminApi.saveVehicle);

const photo = (state: AdminImage['state'], jobPending: boolean): AdminImage => ({
  id: 'p1', kind: 'Photo', state, jobPending, isStaged: true, isCover: false, sortOrder: 0, failureReason: state === 'Failed' ? 'transient' : null,
  cardUrl: state === 'Ready' ? '/api/admin/vehicles/v1/images/p1/card' : null,
  detailUrl: state === 'Ready' ? '/api/admin/vehicles/v1/images/p1/detail' : null,
});

describe('editor video saving', () => {
  const poster: AdminImage = { ...photo('Ready', false), id: 'poster', kind: 'VideoPoster', isStaged: false };
  const withVideo = (): AdminVehicle => ({
    ...vehicle({ ...photo('Ready', false), isStaged: false }),
    images: [{ ...photo('Ready', false), isStaged: false }, poster],
    videos: [{ id: 'video1', state: 'Ready', isStaged: false, sizeBytes: 1024, url: '/admin/video1', posterImageId: poster.id }],
  });

  beforeEach(() => {
    vi.useFakeTimers();
    getVehicle.mockReset();
    saveVehicle.mockReset();
    vi.mocked(adminApi.videoIntent).mockReset().mockResolvedValue({ videoId: 'replacement', uploadUrl: '/upload/video', expiresInSeconds: 3600 });
    vi.mocked(adminApi.completeVideo).mockReset().mockResolvedValue({ videoId: 'replacement', state: 'Ready' });
    vi.mocked(adminApi.imageIntent).mockReset().mockResolvedValue({ imageId: 'new-poster', uploadUrl: '/upload/poster', expiresInSeconds: 3600 });
    vi.mocked(adminApi.completeImage).mockReset().mockResolvedValue({ imageId: 'new-poster', state: 'Processing' });
    vi.mocked(uploadFile).mockReset().mockResolvedValue(undefined);
    vi.mocked(extractPoster).mockReset().mockResolvedValue({ blob: new Blob(['jpeg'], { type: 'image/jpeg' }), durationSeconds: 10 });
    vi.mocked(isFastStart).mockReset().mockResolvedValue(true);
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = vi.fn(() => 'blob:poster');
      static revokeObjectURL = vi.fn();
    });
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  async function open(data: AdminVehicle) {
    getVehicle.mockResolvedValue(data);
    saveVehicle.mockResolvedValue(data);
    const router = createMemoryRouter([{ path: '/admin/vehiculos/:id', element: <AdminVehicleEditor /> }], { initialEntries: ['/admin/vehiculos/v1'] });
    const view = render(<RouterProvider router={router} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    return view;
  }

  async function saveChanges() {
    expect(saveButton().disabled).toBe(false);
    await act(async () => { saveButton().click(); await vi.advanceTimersByTimeAsync(0); });
  }

  it('poster images are not listed among the photos', async () => {
    await open(withVideo());
    const photos = within(screen.getByRole('region', { name: adminCopy.editor.sections.photos }));
    expect(photos.getAllByRole('listitem')).toHaveLength(1);
    fireEvent.click(photos.getByRole('button', { name: /Quitar/ }));
    await saveChanges();
    expect(saveVehicle.mock.calls[0][1].gallery).toEqual({ order: [], removed: ['p1'] });
  });

  it('removing the video sends keep null', async () => {
    await open(withVideo());
    const video = within(screen.getByRole('region', { name: 'Vídeo' }));
    fireEvent.click(video.getByRole('button', { name: 'Quitar' }));
    await saveChanges();
    expect(saveVehicle).toHaveBeenCalledWith('v1', expect.objectContaining({ video: { keep: null } }));
  });

  it('an untouched video is not sent', async () => {
    await open(withVideo());
    fireEvent.change(screen.getByLabelText(adminCopy.fields.model), { target: { value: 'M3' } });
    await saveChanges();
    expect(saveVehicle).toHaveBeenCalledTimes(1);
    expect(saveVehicle.mock.calls[0][1]).not.toHaveProperty('video');
  });

  it('hides photo cover actions until the video is removed', async () => {
    const data = withVideo();
    data.images.push({ ...photo('Ready', false), id: 'p2', isStaged: false });
    await open(data);
    expect(screen.queryByRole('button', { name: /Hacer portada/ })).toBeNull();
    fireEvent.click(within(screen.getByRole('region', { name: 'Vídeo' })).getByRole('button', { name: 'Quitar' }));
    expect(screen.getByRole('button', { name: /Hacer portada/ })).toBeTruthy();
  });

  it.each([
    ['PendingUpload', false], ['Processing', false], ['Ready', true],
  ] as const)('waits for a kept staged poster in state %s with jobPending %s before saving', async (state, jobPending) => {
    const data = withVideo();
    await open(data);
    const replacement: AdminVehicle = {
      ...data,
      images: [...data.images, { ...poster, id: 'new-poster', isStaged: true, state, jobPending }],
      videos: [...data.videos, { ...data.videos[0], id: 'replacement', isStaged: true, posterImageId: 'new-poster' }],
    };
    getVehicle.mockResolvedValue(replacement);
    await act(async () => {
      fireEvent.change(screen.getByLabelText(adminCopy.video.title, { selector: 'input' }), { target: { files: [new File(['mp4'], 'car.mp4', { type: 'video/mp4' })] } });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(saveButton().disabled).toBe(true);
    const ready = { ...replacement, images: replacement.images.map((image) => ({ ...image, state: 'Ready' as const, jobPending: false })) };
    getVehicle.mockResolvedValue(ready);
    saveVehicle.mockResolvedValue({ ...ready, videos: [{ ...ready.videos[1], isStaged: false }], images: ready.images.map((image) => ({ ...image, isStaged: false })) });
    await wait(1500);
    await saveChanges();
    expect(saveVehicle.mock.calls[0][1]).toEqual({ video: { keep: 'replacement' } });
    expect(saveButton().disabled).toBe(true);
  });

  it('shows a failed poster error and offers change without allowing save', async () => {
    const data = withVideo();
    data.images[1] = { ...poster, state: 'Failed' };
    await open(data);
    fireEvent.change(screen.getByLabelText(adminCopy.fields.model), { target: { value: 'M3' } });
    expect(saveButton().disabled).toBe(true);
    expect(screen.getByText(adminCopy.errors.codes.video_poster_failed)).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Vídeo' })).getByRole('button', { name: 'Cambiar' })).toBeTruthy();
  });

  it('discards staged media without calling the photo remove endpoint for a poster', async () => {
    const data = withVideo();
    data.images.push({ ...poster, id: 'staged-poster', isStaged: true });
    data.videos.push({ ...data.videos[0], id: 'staged-video', isStaged: true, posterImageId: 'staged-poster' });
    await open(data);
    removeImage.mockReset();
    fireEvent.change(screen.getByLabelText(adminCopy.fields.model), { target: { value: 'M3' } });
    await act(async () => { screen.getByRole('button', { name: adminCopy.editor.discard }).click(); await vi.advanceTimersByTimeAsync(0); });
    expect(removeImage).not.toHaveBeenCalled();
    expect(saveButton().disabled).toBe(true);
  });

  it.each(['resolve', 'reject'] as const)('ignores a video reload that will %s after unmount', async (outcome) => {
    const data = withVideo();
    const view = await open(data);
    let resolve!: (value: AdminVehicle) => void;
    let reject!: (reason: unknown) => void;
    const delayed = new Promise<AdminVehicle>((yes, no) => { resolve = yes; reject = no; });
    getVehicle.mockReturnValue(delayed);
    await act(async () => {
      fireEvent.change(screen.getByLabelText(adminCopy.video.title, { selector: 'input' }), { target: { files: [new File(['mp4'], 'car.mp4', { type: 'video/mp4' })] } });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(getVehicle.mock.calls.length).toBeGreaterThan(1);
    view.unmount();
    const readResult = vi.fn(() => data.videos);
    const result = { ...data, get videos() { return readResult(); } };
    const failure = new ApiError(500);
    const readError = vi.fn(() => 'invalid_video');
    Object.defineProperty(failure, 'code', { get: readError });
    await act(async () => {
      if (outcome === 'resolve') resolve(result);
      else reject(failure);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(readResult).not.toHaveBeenCalled();
    expect(readError).not.toHaveBeenCalled();
  });
});

const vehicle = (image: AdminImage): AdminVehicle => ({
  id: 'v1', slug: 'bmw-m4', status: 'Draft', showWhenSold: false, make: 'BMW', model: 'M4', year: 2023, month: 6,
  priceEur: null, internalReference: null, description: null, mileageKm: null, powerHp: null, variant: null, fuelType: null,
  transmission: null, bodyType: null, drivetrain: null, exteriorColour: null, interior: null, history: null,
  provenance: null, equipment: [], customSpecifications: [], images: [image], videos: [], updatedAt: '2026-10-01T00:00:00Z', publishedAt: null,
});

/** The editor as it opens after a reload: nothing is remembered from the tab that uploaded the photo. */
async function openEditor(...answers: AdminImage[]) {
  for (const image of answers) getVehicle.mockResolvedValueOnce(vehicle(image));
  getVehicle.mockResolvedValue(vehicle(answers[answers.length - 1]));
  const router = createMemoryRouter([{ path: '/admin/vehiculos/:id', element: <AdminVehicleEditor /> }], { initialEntries: ['/admin/vehiculos/v1'] });
  render(<RouterProvider router={router} />);
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
}

/** One polling period per act, so React applies each answer and schedules the next request. */
async function wait(ms: number) {
  for (let left = ms; left > 0; left -= 1500) await act(async () => { await vi.advanceTimersByTimeAsync(Math.min(1500, left)); });
}
const saveButton = () => screen.getByRole('button', { name: adminCopy.editor.save }) as HTMLButtonElement;

describe('editor photo tracking after a reload', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getVehicle.mockReset();
  });
  afterEach(() => { vi.useRealTimers(); });

  it('follows a photo whose job is still queued until it is ready, then lets the editor save', async () => {
    await openEditor(photo('PendingUpload', true), photo('PendingUpload', true), photo('Processing', true), photo('Ready', false));
    expect(saveButton().disabled).toBe(true);
    expect(screen.queryByText(adminCopy.photos.incomplete)).toBeNull();

    await wait(1500 * 3);
    expect(getVehicle).toHaveBeenCalledTimes(4);
    expect(saveButton().disabled).toBe(false);

    await wait(30_000);
    expect(getVehicle).toHaveBeenCalledTimes(4);
  });

  it('follows a photo being processed until it is ready', async () => {
    await openEditor(photo('Processing', true), photo('Ready', false));
    expect(saveButton().disabled).toBe(true);
    await wait(1500);
    expect(saveButton().disabled).toBe(false);
    await wait(30_000);
    expect(getVehicle).toHaveBeenCalledTimes(2);
  });

  it('follows a failed photo the worker will retry', async () => {
    await openEditor(photo('Failed', true), photo('Processing', true), photo('Ready', false));
    await wait(1500 * 2);
    expect(getVehicle).toHaveBeenCalledTimes(3);
    expect(saveButton().disabled).toBe(false);
    await wait(30_000);
    expect(getVehicle).toHaveBeenCalledTimes(3);
  });

  it('does not ask again for a photo that is already finished', async () => {
    await openEditor(photo('Ready', false));
    await wait(30_000);
    expect(getVehicle).toHaveBeenCalledTimes(1);
    expect(saveButton().disabled).toBe(false);
  });

  it('does not ask without end for an abandoned upload, which stays incomplete', async () => {
    await openEditor(photo('PendingUpload', false));
    await wait(30_000);
    expect(getVehicle).toHaveBeenCalledTimes(1);
    expect(screen.getByText(adminCopy.photos.incomplete)).toBeTruthy();
    expect(saveButton().disabled).toBe(true);
  });
});

describe('discarding a draft with a staged photo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getVehicle.mockReset();
    removeImage.mockReset();
  });
  afterEach(() => { vi.useRealTimers(); });

  async function discard() {
    const button = screen.getByRole('button', { name: adminCopy.editor.discard }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    await act(async () => { button.click(); await vi.advanceTimersByTimeAsync(0); });
    return button;
  }

  it('finishes when the photo is already gone from the server', async () => {
    removeImage.mockRejectedValue(new ApiError(404));
    await openEditor(photo('Ready', false));
    const button = await discard();
    expect(removeImage).toHaveBeenCalledWith('v1', 'p1');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(button.disabled).toBe(true);
  });

  it('still stops on any other failure', async () => {
    removeImage.mockRejectedValue(new ApiError(500));
    await openEditor(photo('Ready', false));
    const button = await discard();
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(button.disabled).toBe(false);
  });
});
