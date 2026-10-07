import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AdminVehicleEditor } from './AdminVehicleEditor';
import { adminApi } from '../../services/adminApi';
import { adminCopy } from '../../i18n/adminCopy';
import type { AdminImage, AdminVehicle } from '../../types/admin';

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return { ...actual, adminApi: { getVehicle: vi.fn() } };
});

const getVehicle = vi.mocked(adminApi.getVehicle);

const photo = (state: AdminImage['state'], jobPending: boolean): AdminImage => ({
  id: 'p1', state, jobPending, isStaged: true, isCover: false, sortOrder: 0, failureReason: state === 'Failed' ? 'transient' : null,
  cardUrl: state === 'Ready' ? '/api/admin/vehicles/v1/images/p1/card' : null,
  detailUrl: state === 'Ready' ? '/api/admin/vehicles/v1/images/p1/detail' : null,
});

const vehicle = (image: AdminImage): AdminVehicle => ({
  id: 'v1', slug: 'bmw-m4', status: 'Draft', showWhenSold: false, make: 'BMW', model: 'M4', year: 2023, month: 6,
  priceEur: null, internalReference: null, description: null, mileageKm: null, powerHp: null, variant: null, fuelType: null,
  transmission: null, bodyType: null, drivetrain: null, exteriorColour: null, interior: null, history: null,
  provenance: null, equipment: [], customSpecifications: [], images: [image], updatedAt: '2026-10-01T00:00:00Z', publishedAt: null,
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
