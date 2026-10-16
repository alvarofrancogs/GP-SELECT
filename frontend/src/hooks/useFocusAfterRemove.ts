import { useEffect, useState, type RefObject } from 'react';

/** After an item is removed, keeps keyboard focus in the list instead of dropping it on <body>: the `[data-remove]` button
    now at the same position (the next item), else the last one (the previous item), else `fallback`.
    Call the returned function with the removed item's index. */
export function useFocusAfterRemove(list: RefObject<HTMLElement | null>, fallback: RefObject<HTMLElement | null>) {
  const [removed, setRemoved] = useState<number | null>(null);
  useEffect(() => {
    if (removed === null) return;
    const buttons = Array.from(list.current?.querySelectorAll<HTMLButtonElement>('[data-remove]') ?? [])
      .filter((button) => !button.disabled);
    (buttons[Math.min(removed, buttons.length - 1)] ?? fallback.current)?.focus();
    setRemoved(null);
  }, [removed, list, fallback]);
  return setRemoved;
}
