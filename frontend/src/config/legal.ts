/** The holder's details for the legal pages (LSSI art. 10, GDPR art. 13). Fill them with verified data only:
    until then each page shows a visible "Pendiente" mark and the production build warns. Never invent them.
    Shared by the client and the SEO build, so it must not read import.meta.env. */
export interface LegalConfig {
  /** Company name, or full name for a sole trader. */
  holder: string | null;
  /** NIF / CIF. */
  taxId: string | null;
  /** Registered or tax address. Required by the LSSI even without a public showroom. */
  address: string | null;
  /** Contact address, also used to exercise data-protection rights. */
  email: string | null;
  /** Optional. */
  phone: string | null;
  /** Optional: Registro Mercantil details, for a company. */
  registry: string | null;
  /** How long enquiries are kept, e.g. "12 meses". */
  retention: string | null;
  /** Date of the last review of the legal texts. */
  updated: string;
}

export const legalConfig: LegalConfig = {
  holder: 'Miguel Reverte Peñalver',
  taxId: '49442146N',
  address: null,
  email: null,
  phone: '+34 661 631 555',
  registry: null,
  retention: null,
  updated: '9 de octubre de 2026',
};

export type LegalField = Exclude<keyof LegalConfig, 'updated'>;

export const requiredLegalFields: LegalField[] = ['holder', 'taxId', 'address', 'email', 'retention'];

export function missingLegalFields(config: LegalConfig = legalConfig): LegalField[] {
  return requiredLegalFields.filter((field) => !config[field]?.trim());
}
