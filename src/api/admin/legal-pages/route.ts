import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LEGAL_MODULE } from "../../../index"

// Why: Admin API endpoints allowing store managers to list and create legal notices and compliance pages.
// Tricky logic: Slugs are automatically normalized (trimmed and lowercased) and validated against URI conventions
// before saving to prevent broken frontend routing.
// TODO: Add input schema validation using Zod.
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const legalService = req.scope.resolve(LEGAL_MODULE) as any

  try {
    const pages = await legalService.listLegalPages({}, {
      order: {
        created_at: "ASC",
      },
    })

    res.json({
      legal_pages: pages,
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to list legal pages",
      error: error.message,
    })
  }
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const legalService = req.scope.resolve(LEGAL_MODULE) as any
  const body = req.body as any

  const title = body?.title?.trim()
  const rawSlug = body?.slug?.trim()
  const content = body?.content || ""
  const locale = (body?.locale || "en").toLowerCase().trim()
  const isPublished = typeof body?.is_published === "boolean" ? body.is_published : true
  const version = body?.version || "1.0"

  if (!title) {
    return res.status(400).json({ message: "Field 'title' is required" })
  }

  // Derive slug from title if not explicitly supplied
  const slug = (rawSlug || title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")

  try {
    // Why: Ensure uniqueness per (slug, locale) tuple so multiple languages can coexist for the same document slug.
    // Tricky logic: Two pages can share the slug 'impressum' as long as their locale values differ (e.g. 'de' vs 'ku').
    const existing = await legalService.listLegalPages({ slug, locale })
    if (existing.length > 0) {
      return res.status(409).json({
        message: `A page with slug '${slug}' and locale '${locale}' already exists.`,
      })
    }

    const metadata = body?.metadata || { group_id: slug }

    const newPage = await legalService.createLegalPages({
      slug,
      title,
      content,
      locale,
      is_published: isPublished,
      version,
      metadata,
    })

    res.status(201).json({
      legal_page: newPage,
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to create legal page",
      error: error.message,
    })
  }
}
