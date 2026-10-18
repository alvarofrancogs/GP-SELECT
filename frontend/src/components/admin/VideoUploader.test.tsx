import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VideoUploader } from './VideoUploader';
import { adminApi, ApiError, uploadFile } from '../../services/adminApi';
import { extractPoster, isFastStart, MAX_VIDEO_BYTES, UnreadableVideoError } from '../../lib/videoFile';
import { adminCopy } from '../../i18n/adminCopy';

vi.mock('../../services/adminApi', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../services/adminApi')>(),
  uploadFile: vi.fn(),
  adminApi: { videoIntent: vi.fn(), completeVideo: vi.fn(), imageIntent: vi.fn(), completeImage: vi.fn() },
}));
vi.mock('../../lib/videoFile', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../lib/videoFile')>(), extractPoster: vi.fn(), isFastStart: vi.fn(),
}));

const videoIntent = vi.mocked(adminApi.videoIntent);
const completeVideo = vi.mocked(adminApi.completeVideo);
const imageIntent = vi.mocked(adminApi.imageIntent);
const completeImage = vi.mocked(adminApi.completeImage);
const put = vi.mocked(uploadFile);
const onChange = vi.fn();
const onBusyChange = vi.fn();
const file = () => new File(['mp4'], 'car.mp4', { type: 'video/mp4' });

function open(disabled = false) {
  return render(<VideoUploader vehicleId="v1" videos={[]} images={[]} disabled={disabled} onChange={onChange} onBusyChange={onBusyChange} />);
}
function choose(selected = file()) {
  fireEvent.change(screen.getByLabelText(adminCopy.video.title, { selector: 'input' }), { target: { files: [selected] } });
}

describe('video upload', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    videoIntent.mockResolvedValue({ videoId: 'video1', uploadUrl: '/upload/video', expiresInSeconds: 3600 });
    completeVideo.mockResolvedValue({ videoId: 'video1', state: 'Ready' });
    imageIntent.mockResolvedValue({ imageId: 'poster1', uploadUrl: '/upload/poster', expiresInSeconds: 3600 });
    completeImage.mockResolvedValue({ imageId: 'poster1', state: 'Processing' });
    put.mockImplementation(async (_url, _file, progress) => { progress(1); });
    vi.mocked(extractPoster).mockResolvedValue({ blob: new Blob(['jpeg'], { type: 'image/jpeg' }), durationSeconds: 10 });
    vi.mocked(isFastStart).mockResolvedValue(true);
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = vi.fn(() => 'blob:poster');
      static revokeObjectURL = vi.fn();
    });
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('uploads the video before a staged JPEG File poster and reports busy through both transfers', async () => {
    const view = open();
    const selected = file();
    choose(selected);
    expect(onBusyChange).toHaveBeenCalledWith(true);
    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false));
    expect(videoIntent).toHaveBeenCalledWith('v1', selected, expect.any(String));
    expect(put).toHaveBeenNthCalledWith(1, '/upload/video', selected, expect.any(Function));
    const posterFile = imageIntent.mock.calls[0][1];
    expect(posterFile).toBeInstanceOf(File);
    expect(posterFile.name).toBe('poster.jpg');
    expect(posterFile.type).toBe('image/jpeg');
    expect(imageIntent).toHaveBeenCalledWith('v1', posterFile, expect.any(String), true, { videoId: 'video1' });
    expect(put).toHaveBeenNthCalledWith(2, '/upload/poster', posterFile, expect.any(Function));
    expect(completeVideo.mock.invocationCallOrder[0]).toBeLessThan(imageIntent.mock.invocationCallOrder[0]);
    expect(completeVideo).toHaveBeenCalledWith('v1', 'video1', videoIntent.mock.calls[0][2]);
    expect(completeImage).toHaveBeenCalledWith('v1', 'poster1', imageIntent.mock.calls[0][2]);
    expect(onChange).toHaveBeenLastCalledWith('video1');
    view.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:poster');
  });

  it.each(['video intent', 'video completion', 'poster intent', 'poster completion'] as const)('reuses the request key after a lost %s response', async (stage) => {
    const failing = { 'video intent': videoIntent, 'video completion': completeVideo, 'poster intent': imageIntent, 'poster completion': completeImage }[stage];
    failing.mockRejectedValueOnce(new ApiError(0));
    open();
    choose();
    await screen.findByText(adminCopy.errors.network);
    fireEvent.click(screen.getByRole('button', { name: adminCopy.errors.retry }));
    await waitFor(() => expect(completeImage).toHaveBeenCalledTimes(stage === 'poster completion' ? 2 : 1));
    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false));
    expect(failing.mock.calls[0][2]).toBe(failing.mock.calls[1][2]);
    expect(put).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith('video1');
  });

  it('rejects unsupported types and oversized files before extracting or uploading', () => {
    open();
    choose(new File(['webm'], 'car.webm', { type: 'video/webm' }));
    expect(screen.getByRole('alert').textContent).toBe(adminCopy.video.wrongType);
    const large = file();
    Object.defineProperty(large, 'size', { value: MAX_VIDEO_BYTES + 1 });
    choose(large);
    expect(screen.getByRole('alert').textContent).toBe(adminCopy.video.tooLarge);
    expect(extractPoster).not.toHaveBeenCalled();
    expect(videoIntent).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('recovers an expired poster PUT with a new intent and key using the same poster file', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    put.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new ApiError(0));
    open();
    choose();
    await screen.findByText(adminCopy.errors.network);
    const original = imageIntent.mock.calls[0];
    imageIntent.mockResolvedValueOnce({ imageId: 'poster2', uploadUrl: '/upload/new-poster', expiresInSeconds: 3600 });
    now.mockReturnValue(1_000_000 + 3600_000);
    onChange.mockClear();
    fireEvent.click(screen.getByRole('button', { name: adminCopy.errors.retry }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('video1'));
    expect(imageIntent.mock.calls[1][2]).not.toBe(original[2]);
    expect(imageIntent.mock.calls[1][1]).toBe(original[1]);
    expect(put).toHaveBeenLastCalledWith('/upload/new-poster', original[1], expect.any(Function));
    expect(completeImage).toHaveBeenCalledWith('v1', 'poster2', imageIntent.mock.calls[1][2]);
    expect(videoIntent).toHaveBeenCalledTimes(1);
    expect(completeVideo).toHaveBeenCalledTimes(1);
  });

  it('retries a server-reported failed poster with a new intent and the retained poster file', async () => {
    const view = open();
    choose();
    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false));
    const original = imageIntent.mock.calls[0];
    view.rerender(<VideoUploader vehicleId="v1"
      videos={[{ id: 'video1', state: 'Ready', isStaged: true, sizeBytes: 3, url: '/video1', posterImageId: 'poster1' }]}
      images={[{ id: 'poster1', kind: 'VideoPoster', state: 'Failed', isStaged: true, isCover: false, sortOrder: 0,
        cardUrl: null, detailUrl: null, failureReason: 'failed', jobPending: false }]}
      onChange={onChange} onBusyChange={onBusyChange} />);
    imageIntent.mockResolvedValueOnce({ imageId: 'poster2', uploadUrl: '/upload/new-poster', expiresInSeconds: 3600 });
    onChange.mockClear();
    fireEvent.click(screen.getByRole('button', { name: adminCopy.errors.retry }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('video1'));
    expect(imageIntent.mock.calls[1][2]).not.toBe(original[2]);
    expect(imageIntent.mock.calls[1][1]).toBe(original[1]);
    expect(put).toHaveBeenLastCalledWith('/upload/new-poster', original[1], expect.any(Function));
    expect(videoIntent).toHaveBeenCalledTimes(1);
  });

  it('shows bitrate and fast start warnings without blocking the upload', async () => {
    const selected = file();
    Object.defineProperty(selected, 'size', { value: 20_000_000 });
    vi.mocked(isFastStart).mockResolvedValue(false);
    open();
    choose(selected);
    await screen.findByText(adminCopy.video.fastStartWarning);
    expect(screen.getByText(adminCopy.video.bitrateWarning)).toBeTruthy();
    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false));
    expect(completeImage).toHaveBeenCalledTimes(1);
  });

  it.each([413, 415])('maps video upload status %s to the video error copy', async (status) => {
    put.mockRejectedValueOnce(new ApiError(status));
    open();
    choose();
    expect(await screen.findByText(status === 413 ? adminCopy.video.tooLarge : adminCopy.video.wrongType)).toBeTruthy();
  });

  it('explains a file the browser cannot read and offers only another file, not Retry', async () => {
    vi.mocked(extractPoster).mockRejectedValueOnce(new UnreadableVideoError());
    open();
    choose();
    expect(await screen.findByText(adminCopy.video.unreadable)).toBeTruthy();
    expect(screen.queryByRole('button', { name: adminCopy.errors.retry })).toBeNull();
    expect(screen.getByRole('button', { name: adminCopy.video.pick })).toBeTruthy();
    expect(videoIntent).not.toHaveBeenCalled();
  });

  it('describes the pick button with the help text and moves focus to it after Remove', () => {
    render(<VideoUploader vehicleId="v1"
      videos={[{ id: 'video1', state: 'Ready', isStaged: false, sizeBytes: 3, url: '/video1', posterImageId: 'poster1' }]}
      images={[{ id: 'poster1', kind: 'VideoPoster', state: 'Ready', isStaged: false, isCover: true, sortOrder: 0,
        cardUrl: '/poster1/card', detailUrl: '/poster1/detail', failureReason: null, jobPending: false }]}
      onChange={onChange} onBusyChange={onBusyChange} />);
    expect(screen.getByRole('img').getAttribute('alt')).toBe(adminCopy.video.posterLabel);
    const change = screen.getByRole('button', { name: adminCopy.video.change });
    expect(change.getAttribute('aria-describedby')).toBe('video-help');
    expect(screen.getByLabelText(adminCopy.video.title, { selector: 'input' }).hasAttribute('aria-describedby')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: adminCopy.video.remove }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: adminCopy.video.pick }));
  });

  it('does not start an upload while disabled', () => {
    open(true);
    choose();
    expect(extractPoster).not.toHaveBeenCalled();
    expect(onBusyChange).not.toHaveBeenCalled();
  });
});
