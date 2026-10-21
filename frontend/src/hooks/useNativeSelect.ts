import { useSyncExternalStore } from 'react';

const nativeQuery = '(pointer: coarse), (max-width: 767px)';
const getSnapshot = () => window.matchMedia?.(nativeQuery).matches ?? false;
const getServerSnapshot = () => false;

function subscribe(onChange: () => void) {
  const media = window.matchMedia?.(nativeQuery);
  media?.addEventListener('change', onChange);
  return () => media?.removeEventListener('change', onChange);
}

/** Let the platform own pickers on touch and small screens, including changes of input/viewport. */
export function useNativeSelect() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
