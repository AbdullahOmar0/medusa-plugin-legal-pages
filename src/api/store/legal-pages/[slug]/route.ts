import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LEGAL_MODULE } from "../../../../index"

// Why: Public storefront endpoint delivering the complete legal document body (Markdown) for a specific slug
// (e.g. 'agb', 'datenschutz', 'impressum') to render inside the mobile app or web legal screens.
// Tricky logic: Automatically falls back to German ('de') if the requested locale translation doesn't exist yet,
// preventing blank screens on Kurdish or English user devices while complying with German statutory notice duties.
// TODO: Return 304 Not Modified when ETag matching the updated_at timestamp is sent.
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const legalService = req.scope.resolve(LEGAL_MODULE) as any
  const { slug } = req.params
  const fullUrl = (req as any).originalUrl || req.url || ""
  const searchParams = new URL(fullUrl, "http://localhost").searchParams
  const localeQuery =
    ((req.query as any)?.locale as string) ||
    searchParams.get("locale") ||
    undefined

  try {
    const page = await legalService.getBySlug(slug, localeQuery)

    if (!page) {
      return res.status(404).json({
        message: `Legal page with slug '${slug}' was not found or is unpublished.`,
      })
    }

    res.json({
      legal_page: page,
    })
  } catch (error: any) {
    res.status(500).json({
      message: `Failed to fetch legal page '${slug}'`,
      error: error.message,
    })
  }
}
