import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LEGAL_MODULE } from "../../../../index"

// Why: Admin API endpoints allowing store managers to retrieve, edit, and delete individual legal documents.
// Tricky logic: When updating the slug, we check for conflicting duplicate slugs excluding the current record's ID
// so a user can safely save without false-positive uniqueness constraint collisions.
// TODO: Save historical snapshot of content for legal auditing and dispute defense.
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const legalService = req.scope.resolve(LEGAL_MODULE) as any
  const { id } = req.params

  try {
    const page = await legalService.retrieveLegalPage(id)
    if (!page) {
      return res.status(404).json({ message: `Legal page '${id}' not found` })
    }

    res.json({
      legal_page: page,
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to retrieve legal page",
      error: error.message,
    })
  }
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const legalService = req.scope.resolve(LEGAL_MODULE) as any
  const { id } = req.params
  const body = req.body as any

  try {
    const existing = await legalService.retrieveLegalPage(id)
    if (!existing) {
      return res.status(404).json({ message: `Legal page '${id}' not found` })
    }

    const updateData: Record<string, any> = {}

    if (body.title !== undefined) updateData.title = String(body.title).trim()
    if (body.content !== undefined) updateData.content = String(body.content)
    if (body.locale !== undefined) updateData.locale = String(body.locale).toLowerCase().trim()
    if (typeof body.is_published === "boolean") updateData.is_published = body.is_published
    if (body.version !== undefined) updateData.version = String(body.version).trim()
    if (body.metadata !== undefined) updateData.metadata = body.metadata

    const targetSlug = body.slug !== undefined
      ? String(body.slug).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")
      : existing.slug
    const targetLocale = body.locale !== undefined
      ? String(body.locale).toLowerCase().trim()
      : existing.locale

    // Why: Disallow collision only if both slug and locale match another existing record
    // Tricky logic: Enables renaming locales or changing slugs without blocking distinct translations.
    if (targetSlug !== existing.slug || targetLocale !== existing.locale) {
      const conflict = await legalService.listLegalPages({ slug: targetSlug, locale: targetLocale })
      if (conflict.length > 0 && conflict[0].id !== id) {
        return res.status(409).json({
          message: `A page with slug '${targetSlug}' and locale '${targetLocale}' already exists.`,
        })
      }
      updateData.slug = targetSlug
    }

    const updated = await legalService.updateLegalPages({
      id,
      ...updateData,
    })

    res.json({
      legal_page: updated,
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to update legal page",
      error: error.message,
    })
  }
}

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const legalService = req.scope.resolve(LEGAL_MODULE) as any
  const { id } = req.params

  try {
    await legalService.deleteLegalPages([id])
    res.json({
      id,
      deleted: true,
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to delete legal page",
      error: error.message,
    })
  }
}
