import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminAuthProvider, RequireAdmin } from './AdminAuthProvider';
import { AdminLayout } from '../../layouts/AdminLayout';
import { AdminLogin } from '../../pages/admin/AdminLogin';
import { adminApi, ApiError } from '../../services/adminApi';
import { adminCopy } from '../../i18n/adminCopy';

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return { ...actual, adminApi: { me: vi.fn(), login: vi.fn(), logout: vi.fn() } };
});

const me = vi.mocked(adminApi.me);
const logout = vi.mocked(adminApi.logout);

function renderAdmin() {
  return render(<MemoryRouter initialEntries={['/admin']}>
    <AdminAuthProvider>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="login" element={<AdminLogin />} />
          <Route element={<RequireAdmin />}>
            <Route index element={<p>Panel</p>} />
          </Route>
        </Route>
      </Routes>
    </AdminAuthProvider>
  </MemoryRouter>);
}

async function signOutFromPanel() {
  renderAdmin();
  await screen.findByText('Panel');
  fireEvent.click(screen.getByRole('button', { name: adminCopy.logout }));
}

describe('admin sign-out', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
    me.mockResolvedValue({ email: 'admin@gpselect.test', role: 'Admin' });
  });

  it('shows the login once the server confirms the sign-out', async () => {
    logout.mockResolvedValue(undefined);
    await signOutFromPanel();
    expect(await screen.findByRole('heading', { name: adminCopy.login.title })).toBeTruthy();
    expect(logout).toHaveBeenCalled();
  });

  it('treats an already expired session (401) as signed out', async () => {
    logout.mockRejectedValue(new ApiError(401));
    await signOutFromPanel();
    expect(await screen.findByRole('heading', { name: adminCopy.login.title })).toBeTruthy();
  });

  it.each([
    ['a server error', new ApiError(500)],
    ['a lost connection', new ApiError(0)],
  ])('keeps the session and offers a retry after %s', async (_, failure) => {
    logout.mockRejectedValueOnce(failure).mockResolvedValueOnce(undefined);
    await signOutFromPanel();

    expect((await screen.findByRole('alert')).textContent).toContain(adminCopy.signOutFailed);
    expect(screen.queryByRole('heading', { name: adminCopy.login.title })).toBeNull();
    // The cookie may still be valid: the admin is still signed in, so the header keeps its sign-out button.
    expect(screen.getByRole('button', { name: adminCopy.logout })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: adminCopy.errors.retry }));
    expect(await screen.findByRole('heading', { name: adminCopy.login.title })).toBeTruthy();
    expect(logout).toHaveBeenCalledTimes(2);
  });
});
