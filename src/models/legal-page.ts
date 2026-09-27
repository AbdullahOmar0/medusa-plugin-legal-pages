import { model } from "@medusajs/framework/utils"

// Why: Data model storing legal notices, privacy statements, and terms of service (AGB, Datenschutz, Impressum)
// centrally in Medusa so web storefronts and mobile apps (iOS/Android) fetch fresh compliance texts dynamically in multiple languages (de, ku, en).
// Tricky logic: Slugs like 'agb', 'datenschutz', and 'impressum' can have distinct records per locale.
// Uniqueness is enforced at the database level across the composite tuple (slug, locale) so each slug can have German, Kurdish, and English variants.
// TODO: Support historical snapshot versioning tables to retain legal audit logs for customer disputes.
const LegalPage = model.define("legal_page", {
  id: model.id().primaryKey(),
  slug: model.text().index("IDX_LEGAL_PAGE_SLUG"),
  title: model.text(),
  content: model.text(),
  locale: model.text().default("en").index("IDX_LEGAL_PAGE_LOCALE"),
  is_published: model.boolean().default(true),
  version: model.text().default("1.0"),
  metadata: model.json().nullable(),
})

export default LegalPage
