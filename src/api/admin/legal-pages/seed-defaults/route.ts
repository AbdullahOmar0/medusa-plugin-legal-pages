import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LEGAL_MODULE } from "../../../../index"

// Why: Admin utility endpoint allowing store owners to instantly bootstrap compliant German
// legal notices (AGB, Datenschutz, Impressum) into the database with a single click in the Admin UI.
// Tricky logic: Existing pages are preserved and never overwritten by this operation.
// TODO: Allow merchants to choose between different industry templates (e.g. food delivery vs retail vs wholesale).
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const legalService = req.scope.resolve(LEGAL_MODULE) as any

  try {
    const pages = await legalService.seedDefaultTemplates()
    res.json({
      message: "Standard legal templates seeded successfully",
      legal_pages: pages,
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to seed default legal templates",
      error: error.message,
    })
  }
}
