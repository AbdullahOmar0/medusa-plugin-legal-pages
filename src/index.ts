// Why: Root package entrypoint exporting the module service, models, and constants for external consumers.
// Tricky logic: Medusa plugins can be consumed either as full plugins via plugins: [{ resolve: 'medusa-plugin-legal-pages' }]
// or standalone modules. Exporting the module directly from root ensures backwards-compatibility.
// TODO: Add exported TypeScript types for plugin options if configurable options are added.
export * from "./modules/legal-pages"
export { default } from "./modules/legal-pages"
