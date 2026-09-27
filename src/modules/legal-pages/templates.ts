// Why: Defines the LegalTemplate interface and default template repository for medusa-plugin-legal-pages.
// In compliance with open-source privacy standards, no pre-filled personal, company, or bakery-specific texts are bundled.
// Store operators and merchants create and manage their own customized legal texts directly via the Medusa Admin panel.
// TODO: Merchants can import their own custom template JSON arrays if required.

export interface LegalTemplate {
  slug: string
  title: string
  locale: string
  content: string
  metadata?: Record<string, any>
}

// Why: Empty array ensures no company-specific data or unwanted templates are seeded into user databases.
// Merchants create their pages cleanly from scratch or their own legal counsel's texts.
export const DEFAULT_LEGAL_TEMPLATES: LegalTemplate[] = []
