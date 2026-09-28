import type { QualificationContext } from '../types/qualification';

export function qualificationUrl(context: QualificationContext): string {
  const params = new URLSearchParams({ intent: context.intent, source: context.source });
  if (context.intent === 'vehicle') params.set('vehicle', context.vehicleSlug);
  if (context.intent === 'import') {
    if (context.make) params.set('make', context.make);
    if (context.model) params.set('model', context.model);
  }
  return `/contacto?${params.toString()}`;
}
