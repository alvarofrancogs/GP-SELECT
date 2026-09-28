import type { Dictionary } from './types';

export const en: Dictionary = {
  brand: 'GP SELECT',
  languages: { label: 'Language', es: 'Español', en: 'English' },
  nav: {
    home: 'Home', vehicles: 'Stock', import: 'Import',
    services: 'Services', about: 'About', contact: 'Contact', admin: 'Administration',
  },
  hero: {
    left: 'Curated', right: 'Luxury',
    description: 'Curated European sports cars\nwith a focus on timeless design\nand bespoke sourcing.', cta: 'View collection',
  },
  vehicle: {
    left: 'German', right: 'Performance',
    description: 'German precision. Unmistakable character.', cta: 'View vehicles',
  },
  process: {
    eyebrow: 'THE GP SELECT STANDARD', title: 'Every detail. Every decision.',
    steps: [
      { word: 'Search', title: 'The starting point', description: 'A vehicle that is right for you.' },
      { word: 'Inspect', title: 'Attention to detail', description: 'Every detail matters before choosing.' },
      { word: 'Select', title: 'Our standard', description: 'Only what meets our expectations.' },
      { word: 'Deliver', title: 'The next chapter', description: 'Your next car, with confidence.' },
    ],
  },
  common: {
    scroll: 'Scroll to discover', temporaryAsset: 'Temporary asset',
    backHome: 'Back to home', prototype: 'Preview · Phase 3',
    menu: 'Open menu', close: 'Close menu', skipContent: 'Skip to content',
    missingAsset: 'Final image pending', heroAsset: 'Vehicle · side view',
    vehicleAsset: 'BMW M3 · top view', backgroundAsset: 'Photographic background pending',
  },
  comingSoon: {
    eyebrow: 'GP SELECT · PHASE 3', title: 'This page is planned for a later phase.',
    description: 'This release focuses on the home page. This route is prepared, but its content has not been implemented yet.',
    qualification: 'The qualification questionnaire and its backend connection are planned for a later phase. This preview does not collect or send any personal data.',
    unknown: 'Page not found',
  },
};
