import { useEffect } from 'react';

/** Sets the tab title while the calling page is mounted and puts the previous one back afterwards. */
export function useDocumentTitle(title: string | null) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = title;
    return () => { document.title = previous; };
  }, [title]);
}
