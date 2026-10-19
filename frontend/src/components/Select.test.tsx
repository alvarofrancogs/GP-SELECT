import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Select } from './Select';

const options = [{ value: '', label: 'Choose a vehicle' }, { value: 'bmw', label: 'BMW M4 CS' }, { value: 'audi', label: 'Audi RS3' }];
afterEach(() => vi.unstubAllGlobals());

function renderSelect(coarse: boolean, disabled = false) {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: coarse, addEventListener() {}, removeEventListener() {} })));
  const onChange = vi.fn();
  render(<><label id="vehicle-label" htmlFor="vehicle">Vehicle</label><p id="vehicle-error">Choose a vehicle.</p>
    <Select id="vehicle" labelledBy="vehicle-label" value="" options={options} onChange={onChange} disabled={disabled}
      aria-describedby="vehicle-error" aria-invalid aria-required /></>);
  return onChange;
}

it('uses one labelled native control for touch, preserving errors, value and API', () => {
  const onChange = renderSelect(true);
  const control = screen.getByRole('combobox', { name: 'Vehicle' });
  expect(control.tagName).toBe('SELECT');
  expect(control.getAttribute('aria-describedby')).toBe('vehicle-error');
  expect(control.getAttribute('aria-invalid')).toBe('true');
  expect(control.getAttribute('aria-required')).toBe('true');
  fireEvent.change(control, { target: { value: 'bmw' } });
  expect(onChange).toHaveBeenCalledWith('bmw');
  expect(screen.queryByRole('listbox')).toBeNull();
});

it('keeps the native control disabled while loading or sending', () => {
  renderSelect(true, true);
  expect((screen.getByRole('combobox') as HTMLSelectElement).disabled).toBe(true);
});

it('retains desktop keyboard selection, Escape and hidden-list accessibility', () => {
  const onChange = renderSelect(false);
  const control = screen.getByRole('combobox', { name: 'Vehicle' });
  expect(control.tagName).toBe('BUTTON');
  expect(screen.queryByRole('option')).toBeNull();
  fireEvent.keyDown(control, { key: 'ArrowDown' });
  expect(screen.getByRole('listbox')).toBeTruthy();
  fireEvent.keyDown(control, { key: 'End' });
  fireEvent.keyDown(control, { key: 'Enter' });
  expect(onChange).toHaveBeenCalledWith('audi');
  expect(screen.queryByRole('listbox')).toBeNull();
  fireEvent.click(control);
  fireEvent.keyDown(control, { key: 'Escape' });
  expect(control.getAttribute('aria-expanded')).toBe('false');
  expect(onChange).toHaveBeenCalledTimes(1);
});
