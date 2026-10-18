import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { ImageUploader } from './ImageUploader';
import { adminApi, ApiError, uploadFile } from '../../services/adminApi';
import { adminCopy } from '../../i18n/adminCopy';
import type { AdminImage } from '../../types/admin';

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return { ...actual, uploadFile: vi.fn(), adminApi: { imageIntent: vi.fn(), completeImage: vi.fn() } };
});

const intent = vi.mocked(adminApi.imageIntent);
const complete = vi.mocked(adminApi.completeImage);
const put = vi.mocked(uploadFile);
const lost = () => new ApiError(0);

function renderUploader() {
  const view = render(<ImageUploader vehicleId="v1" images={[]} reload={async () => {}} onBusyChange={() => {}}
    onPendingChange={() => {}} onQueuedChange={() => {}} onImageAdded={() => {}} onOrderChange={() => {}} onRemove={() => {}} />);
  const input = view.container.querySelector<HTMLInputElement>('input[type=file]')!;
  fireEvent.change(input, { target: { files: [new File(['x'], 'car.jpg', { type: 'image/jpeg' })] } });
}

const retry = () => fireEvent.click(screen.getByRole('button', { name: adminCopy.photos.retry }));

describe('ImageUploader retries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:car');
    URL.revokeObjectURL = vi.fn();
    put.mockResolvedValue();
  });

  it('repeats the intent with the same Idempotency-Key when its answer was lost', async () => {
    intent.mockRejectedValueOnce(lost()).mockResolvedValueOnce({ imageId: 'i1', uploadUrl: 'https://s3/put', expiresInSeconds: 900 });
    complete.mockResolvedValue({ imageId: 'i1', state: 'Processing' });
    renderUploader();
    await screen.findByRole('button', { name: adminCopy.photos.retry });
    retry();
    await waitFor(() => expect(complete).toHaveBeenCalled());
    expect(intent).toHaveBeenCalledTimes(2);
    expect(intent.mock.calls[0][2]).toEqual(expect.any(String));
    expect(intent.mock.calls[1][2]).toBe(intent.mock.calls[0][2]);
  });

  it('repeats the completion with the same Idempotency-Key, without a new intent', async () => {
    intent.mockResolvedValue({ imageId: 'i1', uploadUrl: 'https://s3/put', expiresInSeconds: 900 });
    complete.mockRejectedValueOnce(lost()).mockResolvedValueOnce({ imageId: 'i1', state: 'Processing' });
    renderUploader();
    await screen.findByRole('button', { name: adminCopy.photos.retry });
    retry();
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(2));
    expect(intent).toHaveBeenCalledTimes(1);
    expect(complete.mock.calls[0][2]).toEqual(expect.any(String));
    expect(complete.mock.calls[1][2]).toBe(complete.mock.calls[0][2]);
  });

  it('asks for a new intent with a new key once the signed URL has expired', async () => {
    intent.mockResolvedValueOnce({ imageId: 'i1', uploadUrl: 'https://s3/put', expiresInSeconds: 900 })
      .mockResolvedValueOnce({ imageId: 'i2', uploadUrl: 'https://s3/put2', expiresInSeconds: 900 });
    put.mockRejectedValueOnce(new ApiError(403)).mockResolvedValue();
    complete.mockResolvedValue({ imageId: 'i2', state: 'Processing' });
    renderUploader();
    await screen.findByRole('button', { name: adminCopy.photos.retry });
    const now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now + 16 * 60 * 1000);
    retry();
    await waitFor(() => expect(complete).toHaveBeenCalledWith('v1', 'i2', expect.any(String)));
    expect(intent.mock.calls[1][2]).not.toBe(intent.mock.calls[0][2]);
    clock.mockRestore();
  });
});

const photo = (id: string): AdminImage => ({ id, kind: 'Photo', state: 'Ready', cardUrl: `/${id}.jpg`, detailUrl: null, isCover: false,
  isStaged: false, sortOrder: 0, failureReason: null, jobPending: false });

function Gallery() {
  const [images, setImages] = useState(['p1', 'p2', 'p3'].map(photo));
  return <ImageUploader vehicleId="v1" images={images} reload={async () => {}} onBusyChange={() => {}} onPendingChange={() => {}}
    onQueuedChange={() => {}} onImageAdded={() => {}} onRemove={(id) => setImages((all) => all.filter((image) => image.id !== id))}
    onOrderChange={(ids) => setImages((all) => ids.map((id) => all.find((image) => image.id === id)!))} />;
}

describe('ImageUploader focus', () => {
  const removeButtons = () => screen.getAllByRole('button', { name: new RegExp(`^${adminCopy.photos.remove}`) });

  it('keeps focus on the next photo after removing one, and on the picker after the last', () => {
    render(<Gallery />);
    const press = (button: HTMLElement) => { button.focus(); fireEvent.click(button); };
    press(removeButtons()[1]); // p2
    expect(document.activeElement).toBe(removeButtons()[1]); // p3
    press(removeButtons()[1]); // p3, the last one
    expect(document.activeElement).toBe(removeButtons()[0]); // p1
    press(removeButtons()[0]);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: adminCopy.photos.pick }));
  });

  it('keeps focus on the photo made cover', () => {
    render(<Gallery />);
    const makeCover = screen.getAllByRole('button', { name: new RegExp(`^${adminCopy.photos.makeCover}`) })[1]; // p3
    makeCover.focus();
    fireEvent.click(makeCover);
    expect(document.activeElement?.closest('li')?.querySelector('img')?.getAttribute('src')).toBe('/p3.jpg');
  });
});
