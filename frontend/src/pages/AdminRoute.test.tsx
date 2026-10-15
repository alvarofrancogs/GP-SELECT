import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminRoute } from './AdminRoute';

// The admin bundle cannot be downloaded (network cut, or a deploy replaced it).
vi.mock('./admin/AdminApp', () => { throw new TypeError('Failed to fetch dynamically imported module'); });

describe('admin bundle download', () => {
  it('shows a loading state, then a way to reload or go back when the bundle fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<MemoryRouter initialEntries={['/admin']}><AdminRoute /></MemoryRouter>);

    expect(screen.getByRole('status').textContent).toBe('Cargando el panel…');
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'No se ha podido abrir el panel.' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Recargar' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Volver a la web' }).getAttribute('href')).toBe('/');
  });
});
