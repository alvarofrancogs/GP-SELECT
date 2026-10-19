import { useId } from 'react';
import type { Locale } from '../i18n/types';

export function Flag({ language }: { language: Locale }) {
  const ukClipId = useId();
  if (language === 'es') return <svg viewBox="0 0 3 2" aria-hidden="true" focusable="false">
    <path fill="#AA151B" d="M0 0h3v2H0z" />
    <path fill="#F1BF00" d="M0 .5h3v1H0z" />
  </svg>;
  return <svg data-flag="uk" viewBox="0 0 60 30" aria-hidden="true" focusable="false">
    <defs><clipPath id={ukClipId}><path d="M30 15h30v15z M30 15v15H0z M30 15H0V0z M30 15V0h30z" /></clipPath></defs>
    <path fill="#012169" d="M0 0h60v30H0z" />
    <path d="M0 0l60 30M60 0L0 30" stroke="#FFFFFF" strokeWidth="6" />
    <path d="M0 0l60 30M60 0L0 30" stroke="#C8102E" strokeWidth="4" clipPath={`url(#${ukClipId})`} />
    <path d="M30 0v30M0 15h60" stroke="#FFFFFF" strokeWidth="10" />
    <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6" />
  </svg>;
}
