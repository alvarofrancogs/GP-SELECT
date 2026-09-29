interface ContactConfig {
  /** International digits only, without + or spaces. */
  whatsapp: string | null;
  /** International phone number, including country code. */
  phone: string | null;
  email: string | null;
}

// Supply verified business channels here when available.
export const contactConfig: ContactConfig = {
  whatsapp: null,
  phone: null,
  email: null,
};

// Show the editorial contact layout locally without inventing business channels.
export const showContactPreview = import.meta.env.DEV;
