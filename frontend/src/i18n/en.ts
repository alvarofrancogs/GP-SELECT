import type { Dictionary } from './types';

export const en: Dictionary = {
  interiors: {
    about: {
      eyebrow: 'GP SELECT · ABOUT US', title: 'About us',
      lede: 'The right car begins with a considered choice.',
      manifesto: ['Selection.', 'Transparency.', 'Judgement.'],
      introduction: {
        title: 'A considered eye.',
        body: 'GP SELECT starts with a simple idea: choosing well matters. We seek out European vehicles with character, for their design, engineering and the experience behind the wheel. And we help you understand what makes each one special.',
      },
      selection: {
        title: 'Beyond the badge.',
        body: 'An interesting specification is just the beginning. We assess the available history, condition, maintenance and how well the vehicle fits your needs. Sports cars, saloons and SUVs: the same care in selection, each with its own way of driving.',
      },
      principlesLabel: 'How we work',
      principles: [
        { title: 'Expert selection', body: 'We compare options and examine each vehicle. Your priorities guide the choice, beyond the specification sheet.' },
        { title: 'Complete import service', body: 'We coordinate sourcing, verification, paperwork and delivery. One point of contact to make sense of every step.' },
        { title: 'Personal attention', body: 'We listen before we suggest. From the first conversation to support after delivery, we stay by your side.' },
      ],
      europe: {
        label: 'A search without borders', title: 'Europe is the starting point.',
        body: 'The European market opens up more possibilities. Our job is to make sense of them: source, inspect and put the information in front of you before you decide.',
        detail: 'History, documents, condition and expected costs. Clear about what we know and what still needs checking. With a person at your side throughout the process.',
      },
      cta: 'Talk to us', images: { selection: 'The GP SELECT selection', detail: 'A closer look at the details' },
    },
    import: {
      eyebrow: 'GP SELECT · COMPLETE SERVICE', title: 'Import', lede: 'The whole journey, from Europe to your garage.',
      steps: [
        { id: 'search', title: 'Search', body: 'First, we understand what you want to drive. Model, specification, use and budget shape a personal search across the European market.', detail: 'Your priorities guide the selection.' },
        { id: 'verify', title: 'Verify', body: 'We study the available history and documents, cross-check mileage and review the vehicle’s condition. We coordinate an inspection before moving forward.', detail: 'Information before a decision.' },
        { id: 'manage', title: 'Manage', body: 'We negotiate terms and coordinate the transaction, paperwork and everyone involved. You know the next steps and the expected costs.', detail: 'A clear process from start to finish.' },
        { id: 'import', title: 'Import', body: 'We coordinate transport and the documents needed to bring your vehicle home. We manage the paperwork, applicable taxes and fees, and registration for each transaction.', detail: 'Every detail, at the right time.' },
        { id: 'deliver', title: 'Deliver', body: 'We prepare the handover, walk you through your vehicle and documents, and answer your questions. Our support continues with after-sales care.', detail: 'The next chapter starts behind the wheel.' },
      ],
      images: { search: 'Sourcing across the European market', inspection: 'Checking every vehicle', delivery: 'From origin to destination' },
      closing: 'Your next car starts here.', cta: 'Find my car', secondary: 'Ask for advice',
    },
    contact: {
      eyebrow: 'GP SELECT · CONTACT', title: 'Contact', lede: 'Let’s talk about your next vehicle.',
      pathsLabel: 'Where shall we start?', vehiclePath: 'I know which car I want', searchPath: 'I want GP SELECT to help me find it',
      vehicleIntro: 'Tell us which vehicle interests you and what you would like to know. We will start there.',
      searchIntro: 'Tell us what you are looking for: how you drive, the models you like and the budget you have in mind. You do not need to have chosen a vehicle.',
      formTitle: 'Your enquiry', fields: { name: 'Name', phone: 'Phone', email: 'Email', vehicle: 'Vehicle of interest', message: 'Message' },
      optional: 'optional', requiredHint: 'All fields are required unless marked optional.',
      vehicleMessage: 'What would you like to know about this vehicle?', searchMessage: 'What car are you looking for? Tell us your preferences.',
      submit: 'Send enquiry', submitting: 'Preparing enquiry…', preview: 'Preview: you can prepare an enquiry, but it will not be sent or saved yet.',
      successTitle: 'Enquiry prepared.', successBody: 'Your enquiry is ready, but sending is not available yet. GP SELECT has not received it. You can return to the form to review it.',
      edit: 'Back to your enquiry', failure: 'We could not prepare your enquiry. Your details are still in the form; please try again.',
      errors: { name: 'Enter your name (at least 2 characters).', phone: 'Enter a valid phone number with 7 to 15 digits.', email: 'Enter a valid email address.', vehicle: 'Tell us which vehicle interests you.', message: 'Tell us a little more (at least 10 characters).' },
      directLabel: 'Direct contact', whatsappTitle: 'Let’s talk on WhatsApp', whatsappBody: 'A direct conversation to answer your questions and start your search.', whatsappCta: 'Open WhatsApp', phoneLabel: 'Phone', emailLabel: 'Email',
    },
  },
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
  carHandoff: {
    states: [
      { left: 'German', right: 'Performance', description: 'German precision.\nUnmistakable character.' },
      { left: 'Power', right: 'Control', description: 'All the power,\nalways under control.' },
      { left: 'Global', right: 'Vision', description: 'Premium vehicles,\nsourced across Europe.' },
    ],
    cta: 'View vehicles',
    carA: 'BMW M4 · top view',
    carB: 'Audi RS Q3 · top view',
    map: 'Map of Europe',
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
    backgroundAsset: 'Photographic background pending',
  },
  comingSoon: {
    eyebrow: 'GP SELECT · PHASE 3', title: 'This page is planned for a later phase.',
    description: 'This release focuses on the home page. This route is prepared, but its content has not been implemented yet.',
    qualification: 'The qualification questionnaire and its backend connection are planned for a later phase. This preview does not collect or send any personal data.',
    unknown: 'Page not found',
  },
};
