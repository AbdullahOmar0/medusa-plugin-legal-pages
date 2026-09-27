// Why: Ambient declaration allowing TypeScript to import static image assets (.png, .svg) without compilation errors.
// Tricky logic: Medusa Admin Vite build replaces asset imports with URL strings or base64 data URIs.
// TODO: Add support for webp and jpeg asset declarations when adding store logo themes.
declare module "*.png" {
  const content: string
  export default content
}

declare module "*.svg" {
  const content: string
  export default content
}
