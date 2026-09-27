import LegalModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

// Why: Exports the Legal Module definition so Medusa v2 can register and inject it into req.scope and workflows.
// Tricky logic: LEGAL_MODULE constant must match the token used in req.scope.resolve(LEGAL_MODULE).
// In Medusa v2, plugins with a `modules` folder have each module subdirectory automatically discovered.
// TODO: Export workflow steps for legal page versioning and notification triggers.
export const LEGAL_MODULE = "legal"

export default Module(LEGAL_MODULE, {
  service: LegalModuleService,
})

export * from "./templates"
export { default as LegalModuleService } from "./service"
export { default as LegalPage } from "./models/legal-page"
