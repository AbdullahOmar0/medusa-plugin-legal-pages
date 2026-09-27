import { MedusaService } from "@medusajs/framework/utils"
import LegalPage from "./models/legal-page"
import { DEFAULT_LEGAL_TEMPLATES } from "./templates"

// Why: Service managing legal page lifecycle (creation, update, retrieval, published status filtering,
// and default boilerplate seeding for German legal compliance).
// Tricky logic: MedusaService dynamically injects CRUD methods (listLegalPages, createLegalPages, etc.)
// at runtime, so we cast `this as any` inside helper methods to ensure TypeScript compilation without manual stubbing.
// TODO: Add audit log history tracking which admin user made text revisions.
class LegalModuleService extends MedusaService({
  LegalPage,
}) {
  // Why: Quick lookup for storefronts and mobile apps to fetch a published legal page by slug or localized slug.
  // Tricky logic: First tries direct match on (slug, locale). If not found, checks if the slug directly matches any published page
  // (e.g. English user navigating to /store/legal-pages/imprint or /legal-notice). If still not found, searches by document group
  // or falls back to German ('de') default so visitors never encounter 404 on canonical notice links.
  // TODO: Add Redis caching layer for ultra-fast edge lookups.
  async getBySlug(slug: string, explicitLocale?: string): Promise<any> {
    const service = this as any
    const normalizedSlug = slug.toLowerCase().trim()

    // 1. Direct match on slug
    const slugMatches = await service.listLegalPages({
      slug: normalizedSlug,
      is_published: true,
    })

    // Why: If no explicit locale was passed and an exact slug match exists (e.g. visitor navigated directly to /imprint or /agahiyen-qanuni),
    // immediately return that localized document.
    if (!explicitLocale && slugMatches.length > 0) {
      return slugMatches[0]
    }

    const targetLocale = (explicitLocale || "en").toLowerCase().trim()

    // If exact slug match has the requested locale
    const exactSlugLocale = slugMatches.find((p: any) => p.locale === targetLocale)
    if (exactSlugLocale) {
      return exactSlugLocale
    }

    // 2. Group matching: Query may be canonical (e.g. /imprint?locale=de) while target page has localized slug ('impressum')
    const allPublished = await service.listLegalPages({
      is_published: true,
    })

    const anchor = slugMatches[0] || allPublished.find((p: any) => {
      const pGroup = p.metadata?.group_id || p.slug
      return pGroup === normalizedSlug
    })

    if (anchor) {
      const groupId = anchor.metadata?.group_id || anchor.slug
      // Look for the requested locale in this document group
      const groupLocaleMatch = allPublished.find((p: any) => {
        const pGroup = p.metadata?.group_id || p.slug
        return pGroup === groupId && p.locale === targetLocale
      })
      if (groupLocaleMatch) {
        return groupLocaleMatch
      }

      // If the slug itself matched a page in another locale, prioritize that over fallback
      if (slugMatches.length > 0) {
        return slugMatches[0]
      }

      // Fallback to English in this group (international default)
      const englishFallback = allPublished.find((p: any) => {
        const pGroup = p.metadata?.group_id || p.slug
        return pGroup === groupId && p.locale === "en"
      })
      if (englishFallback) {
        return englishFallback
      }

      // Secondary fallback to German in this group
      const germanFallback = allPublished.find((p: any) => {
        const pGroup = p.metadata?.group_id || p.slug
        return pGroup === groupId && p.locale === "de"
      })
      if (germanFallback) {
        return germanFallback
      }
    }

    return null
  }

  // Why: Storefront navigation helper returning all published legal documents for mobile and web footers.
  // Tricky logic: Collects all unique document groups and prioritizes the requested locale (e.g. English, Kurdish). If a translation
  // for a given group does not exist, it falls back to the English ('en') default so no statutory page is missing.
  // TODO: Allow merchant to mark specific language translations as draft without hiding the canonical page.
  async listPublishedPages(locale: string = "en"): Promise<any[]> {
    const service = this as any
    const allPublished = await service.listLegalPages({
      is_published: true,
    })

    // Group by group_id (or fallback to slug) and pick best matching locale
    const groupMap = new Map<string, any>()
    for (const page of allPublished) {
      const groupId = page.metadata?.group_id || page.slug
      const existing = groupMap.get(groupId)
      if (!existing) {
        groupMap.set(groupId, page)
      } else if (page.locale === locale) {
        // Preferred locale match overrides fallback
        groupMap.set(groupId, page)
      } else if (existing.locale !== locale && page.locale === "en") {
        // English canonical default overrides arbitrary third locale
        groupMap.set(groupId, page)
      }
    }

    return Array.from(groupMap.values())
  }

  // Why: Seeds initial compliant legal documents (AGB, Datenschutz, Impressum) if the merchant hasn't created them yet
  async seedDefaultTemplates(): Promise<any[]> {
    const service = this as any
    const results = []

    for (const template of DEFAULT_LEGAL_TEMPLATES) {
      const existing = await service.listLegalPages({
        slug: template.slug,
        locale: template.locale,
      })

      if (existing.length === 0) {
        const created = await service.createLegalPages({
          slug: template.slug,
          title: template.title,
          content: template.content,
          locale: template.locale,
          is_published: true,
          version: "1.0",
          metadata: template.metadata || {
            group_id: template.slug,
          },
        })
        results.push(created)
      } else {
        results.push(existing[0])
      }
    }

    return results
  }
}

export default LegalModuleService
