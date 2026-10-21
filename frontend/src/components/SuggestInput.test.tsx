import { afterEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { SuggestInput } from './SuggestInput';

afterEach(() => vi.unstubAllGlobals());

function setup(native: boolean, disabled = false) {
  const media = { matches: native, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal('matchMedia', vi.fn(() => media));
  const onChange = vi.fn();
  const view = render(<><label id="fuel-label" htmlFor="fuel">Combustible</label>
    <p id="fuel-error">Revisa el combustible.</p>
    <SuggestInput id="fuel" value="" suggestions={['Gasolina', 'Diésel']} onChange={onChange}
      maxLength={40} aria-describedby="fuel-error" aria-invalid disabled={disabled} /></>);
  return { onChange, media, ...view };
}

it('uses native datalist suggestions on touch/small screens with the same label and validation', () => {
  const { onChange, container } = setup(true);
  const control = screen.getByRole('combobox', { name: 'Combustible' }) as HTMLInputElement;
  expect(window.matchMedia).toHaveBeenCalledWith('(pointer: coarse), (max-width: 767px)');
  expect(control.tagName).toBe('INPUT');
  expect(control.list?.id).toBe('fuel-suggestions');
  expect(control.maxLength).toBe(40);
  expect(control.getAttribute('aria-describedby')).toBe('fuel-error');
  expect(control.getAttribute('aria-invalid')).toBe('true');
  expect(Array.from(control.list!.options).map((option) => option.value)).toEqual(['Gasolina', 'Diésel']);
  fireEvent.focus(control);
  fireEvent.change(control, { target: { value: 'Diésel' } });
  fireEvent.blur(control, { relatedTarget: null });
  expect(onChange).toHaveBeenCalledWith('Diésel');
  fireEvent.change(control, { target: { value: 'Otro combustible' } });
  expect(onChange).toHaveBeenCalledWith('Otro combustible');
  expect(container.querySelector('ul')).toBeNull();
  expect(control.hasAttribute('aria-expanded')).toBe(false);
});

it('preserves disabled on the native input', () => {
  setup(true, true);
  expect((screen.getByLabelText('Combustible') as HTMLInputElement).disabled).toBe(true);
});

it('retains desktop mouse and keyboard suggestions', () => {
  const { onChange } = setup(false);
  const control = screen.getByRole('combobox', { name: 'Combustible' });
  expect(control.hasAttribute('list')).toBe(false);
  fireEvent.focus(control);
  fireEvent.click(screen.getByRole('option', { name: 'Diésel' }));
  expect(onChange).toHaveBeenLastCalledWith('Diésel');
  fireEvent.focus(control);
  fireEvent.keyDown(control, { key: 'ArrowDown' });
  fireEvent.keyDown(control, { key: 'Enter' });
  expect(onChange).toHaveBeenLastCalledWith('Gasolina');
});

it('switches to the native control when the media query changes and removes its listener on unmount', () => {
  const { media, unmount, container } = setup(false);
  fireEvent.focus(screen.getByRole('combobox', { name: 'Combustible' }));
  act(() => { media.matches = true; media.addEventListener.mock.calls[0][1](); });
  expect((screen.getByRole('combobox', { name: 'Combustible' }) as HTMLInputElement).list).toBeTruthy();
  expect(container.querySelector('ul')).toBeNull();
  unmount();
  expect(media.removeEventListener).toHaveBeenCalledWith('change', media.addEventListener.mock.calls[0][1]);
});
