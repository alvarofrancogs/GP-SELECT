interface ContactConfig {
  /** International digits only, without + or spaces. */
  whatsapp: string | null;
  /** International phone number, including country code. */
  phone: string | null;
  email: string | null;
  /** Public URLs of verified social profiles only. */
  sameAs: string[];
}

// Verified business channels only. Shared by the client and the SEO build.
export const contactConfig: ContactConfig = {
  whatsapp: null,
  phone: null,
  email: null,
  sameAs: [],
};
