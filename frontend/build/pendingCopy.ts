import { en } from '../src/i18n/en';
import { entityCopy } from '../src/i18n/entityCopy';
import { es } from '../src/i18n/es';
import { featuredCopy } from '../src/i18n/featuredCopy';
import { footerCopy } from '../src/i18n/footerCopy';
import { guideCopy } from '../src/i18n/guideCopy';
import { legalPages, legalUi } from '../src/i18n/legalCopy';
import { servicesCopy } from '../src/i18n/servicesCopy';

/** The public copy. A text still waiting for the client's data carries [P] and must never be published. */
const publicCopy = { es, en, entityCopy, featuredCopy, footerCopy, guideCopy, legalPages, legalUi, servicesCopy };

/** Where each [P] marker is, as a path such as es.interiors.import.lede. */
export function findPendingCopy(value: unknown = publicCopy, path = ''): string[] {
  if (typeof value === 'string') return value.includes('[P]') ? [path] : [];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, item]) => findPendingCopy(item, path ? `${path}.${key}` : key));
}
