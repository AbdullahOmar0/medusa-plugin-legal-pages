import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LEGAL_MODULE } from "../../../index"

// Why: Public storefront endpoint returning a list of all published legal pages
// so mobile app and web footer navigation can dynamically list active legal notices.
// Tricky logic: Excludes full Markdown bodies from the summary list to keep initial app boot payload lightweight.
// TODO: Add caching headers (e.g. Cache-Control max-age=3600) when deployed to edge CDNs.
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const legalService = req.scope.resolve(LEGAL_MODULE) as any
  const fullUrl = req.url || ""
  // Why: Resolve requested locale from query parameters or URL string with English ('en') as default.
  // Tricky logic: Medusa HTTP layer may provide parsed req.query or require URLSearchParams fallback on raw URLs.
  // TODO: Add locale detection from Accept-Language request header.
  const queryLocale = (req.query as any)?.locale as string | undefined
  const urlLocale = fullUrl.includes("?")
    ? new URLSearchParams(fullUrl.split("?")[1]).get("locale")
    : null
  const locale = queryLocale || urlLocale || "en"

  try {
    const pages = await legalService.listPublishedPages(locale)

    // Map to lightweight summary format
    const summary = pages.map((page: any) => ({
      id: page.id,
      slug: page.slug,
      title: page.title,
      locale: page.locale,
      version: page.version,
      updated_at: page.updated_at,
    }))

    res.json({
      legal_pages: summary,
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch legal pages",
      error: error.message,
    })
  }
}
