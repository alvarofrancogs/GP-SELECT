import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AdminVehicles } from './AdminVehicles';
import { adminApi, ApiError } from '../../services/adminApi';
import { adminCopy } from '../../i18n/adminCopy';
import type { AdminVehicleRow } from '../../types/admin';

vi.mock('../../services/adminApi', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../services/adminApi')>(),
  adminApi: { listVehicles: vi.fn(), deleteVehicle: vi.fn() },
}));

const row = (id: string, status: AdminVehicleRow['status'] = 'Draft'): AdminVehicleRow => ({
  id, slug: `bmw-${id}`, make: 'BMW', model: id, variant: null, status, year: 2023, month: 6,
  mileageKm: null, powerHp: null, priceEur: null, internalReference: null, coverCardUrl: null,
  imageCount: 0, readyImageCount: 0, updatedAt: '2026-10-01T00:00:00Z', publishedAt: null,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(adminApi.listVehicles).mockReset();
  vi.mocked(adminApi.deleteVehicle).mockReset().mockResolvedValue(undefined);
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

async function flush() { await act(async () => { await vi.advanceTimersByTimeAsync(50); }); }

async function open(rows: AdminVehicleRow[], state?: { announcement: string; vehicleId?: string }) {
  vi.mocked(adminApi.listVehicles).mockResolvedValue(rows);
  const router = createMemoryRouter([{ path: '/admin', element: <AdminVehicles /> }], {
    initialEntries: [{ pathname: '/admin', state }],
  });
  render(<RouterProvider router={router} />);
  await flush();
  await flush();
  return router;
}

describe('delete from the vehicle list', () => {
  it('names the car, allows cancel, then removes the row and focuses the next car', async () => {
    await open([row('M4'), row('M3')]);
    fireEvent.click(screen.getByRole('button', { name: /^Eliminar\s*BMW M4$/ }));
    const dialog = screen.getByRole('dialog', { name: adminCopy.delete.title });
    expect(dialog.textContent).toContain('BMW M4');
    fireEvent.click(within(dialog).getByRole('button', { name: adminCopy.delete.cancel }));
    expect(adminApi.deleteVehicle).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^Eliminar\s*BMW M4$/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: adminCopy.delete.confirm }));
    await flush();
    await flush();
    expect(adminApi.deleteVehicle).toHaveBeenCalledWith('M4');
    expect(screen.queryByRole('link', { name: 'BMW M4' })).toBeNull();
    expect(screen.getByRole('status').textContent).toContain(adminCopy.delete.done);
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'BMW M3' }));
  });

  it('allows deleting an archived car beside Restore, and keeps announcement/focus when the list becomes empty', async () => {
    await open([row('M4', 'Archived')]);
    fireEvent.click(screen.getByLabelText(/Mostrar archivados/));
    expect(screen.getByRole('button', { name: /^Recuperar\s*BMW M4$/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Eliminar\s*BMW M4$/ }));
    fireEvent.click(screen.getByRole('button', { name: adminCopy.delete.confirm }));
    await flush();
    await flush();
    expect(screen.getByText(adminCopy.list.emptyTitle)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain(adminCopy.delete.done);
    expect(document.activeElement).toBe(screen.getByRole('searchbox', { name: 'Buscar' }));
  });

  it('keeps the row and dialog when deletion fails, and allows retry', async () => {
    vi.mocked(adminApi.deleteVehicle).mockRejectedValueOnce(new ApiError(500));
    await open([row('M4')]);
    fireEvent.click(screen.getByRole('button', { name: /^Eliminar\s*BMW M4$/ }));
    fireEvent.click(screen.getByRole('button', { name: adminCopy.delete.confirm }));
    await flush();
    expect(screen.getByRole('alert').textContent).toBe(adminCopy.errors.server);
    expect(screen.getByRole('link', { name: 'BMW M4' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: adminCopy.delete.confirm }));
    await flush();
    expect(adminApi.deleteVehicle).toHaveBeenCalledTimes(2);
  });

  it('treats a 404 as already deleted (a retry after a lost response)', async () => {
    vi.mocked(adminApi.deleteVehicle).mockRejectedValueOnce(new ApiError(404));
    await open([row('M4'), row('M3')]);
    fireEvent.click(screen.getByRole('button', { name: /^Eliminar\s*BMW M4$/ }));
    fireEvent.click(screen.getByRole('button', { name: adminCopy.delete.confirm }));
    await flush();
    await flush();
    expect(screen.queryByRole('link', { name: 'BMW M4' })).toBeNull();
    expect(screen.getByRole('status').textContent).toContain(adminCopy.delete.done);
  });

  it('keeps the dialog busy and sends only one delete while waiting for the server', async () => {
    await open([row('M4')]);
    let finish!: () => void;
    vi.mocked(adminApi.deleteVehicle).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    fireEvent.click(screen.getByRole('button', { name: /^Eliminar\s*BMW M4$/ }));
    const confirm = screen.getByRole('button', { name: adminCopy.delete.confirm }) as HTMLButtonElement;
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(confirm.disabled).toBe(true);
    expect(confirm.textContent).toBe(adminCopy.delete.working);
    expect((screen.getByRole('button', { name: adminCopy.delete.cancel }) as HTMLButtonElement).disabled).toBe(true);
    expect(adminApi.deleteVehicle).toHaveBeenCalledTimes(1);
    await act(async () => { finish(); });
    await flush();
    expect(screen.getByText(adminCopy.list.emptyTitle)).toBeTruthy();
  });
});

describe('returning to the list', () => {
  it('announces the saved changes, scrolls/focuses the edited car and consumes router state', async () => {
    const router = await open([row('M4'), row('M3')], { announcement: adminCopy.editor.saved, vehicleId: 'M3' });
    const car = screen.getByRole('link', { name: 'BMW M3' });
    expect(screen.getByRole('status').textContent).toContain(adminCopy.editor.saved);
    expect(document.activeElement).toBe(car);
    expect(car.scrollIntoView).toHaveBeenCalled();
    expect(router.state.location.state).toBeNull();
  });

  it('focuses the title when the edited car is beyond the loaded batch', async () => {
    await open(Array.from({ length: 11 }, (_, i) => row(`M${i}`)), { announcement: adminCopy.editor.saved, vehicleId: 'M10' });
    expect(screen.queryByRole('link', { name: 'BMW M10' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }));
  });

  it('announces deletion and focuses the title even with no cars left', async () => {
    await open([], { announcement: adminCopy.delete.done });
    expect(screen.getByRole('status').textContent).toContain(adminCopy.delete.done);
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }));
  });
});
