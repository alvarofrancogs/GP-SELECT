import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { ListEditor } from './ListEditor';
import { KeyValueEditor } from './KeyValueEditor';
import { adminCopy } from '../../i18n/adminCopy';
import type { SpecificationRow } from '../../lib/vehicleForm';

function Equipment() {
  const [items, setItems] = useState(['Navi', 'Bose', 'Techo']);
  return <ListEditor items={items} onChange={setItems} label="Equipamiento" />;
}

function Specifications() {
  const [rows, setRows] = useState<SpecificationRow[]>([
    { key: 'a', label: 'Garantía', value: '12 meses' }, { key: 'b', label: 'Llaves', value: '2' }]);
  return <KeyValueEditor rows={rows} onChange={setRows} errors={{}} />;
}

const removeButtons = () => screen.getAllByRole('button', { name: new RegExp(`^${adminCopy.equipment.remove}`) });

function press(button: HTMLElement) {
  button.focus();
  fireEvent.click(button);
}

describe('focus after removing an item', () => {
  it('equipment: the next item, then the previous one, then the input', () => {
    render(<Equipment />);
    press(removeButtons()[1]); // Bose
    expect(document.activeElement).toBe(removeButtons()[1]); // now Techo
    press(removeButtons()[1]); // Techo, the last one
    expect(document.activeElement).toBe(removeButtons()[0]); // Navi
    press(removeButtons()[0]);
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Equipamiento' }));
  });

  it('specifications: the next row, then the add button', () => {
    render(<Specifications />);
    const remove = () => screen.getAllByRole('button', { name: new RegExp(`^${adminCopy.specifications.remove}`) });
    press(remove()[0]);
    expect(document.activeElement).toBe(remove()[0]);
    press(remove()[0]);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: new RegExp(adminCopy.specifications.add) }));
  });
});
