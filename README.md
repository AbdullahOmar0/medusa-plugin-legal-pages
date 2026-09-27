# Medusa v2 Legal Pages & Compliance Plugin

[![Medusa v2](https://img.shields.io/badge/Medusa-v2.x-8C52FF.svg?style=flat-square)](https://medusajs.com)
[![npm version](https://img.shields.io/npm/v/medusa-plugin-legal-pages.svg?style=flat-square)](https://www.npmjs.com/package/medusa-plugin-legal-pages)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/AbdullahOmar0/medusa-plugin-legal-pages?style=flat-square)](https://github.com/AbdullahOmar0/medusa-plugin-legal-pages)

A lightweight, production-ready **Medusa v2 plugin** for managing compliance and legal disclosure pages (**AGB / Terms & Conditions**, **Datenschutzerklärung / Privacy Policy**, and **Impressum / Legal Notice**) directly inside the Medusa Admin panel.

---

## ✨ Features

- **🏛️ Dedicated Medusa Admin UI:** Adds a clean "Legal Pages" route to the Medusa Admin navigation bar.
- **📝 Live Markdown Workspace:** Split-screen editor with real-time customer-facing preview, formatting toolbar, and keyboard shortcuts (`Cmd+S` / `Ctrl+S`).
- **📝 Multi-Document Management:** Create and manage customized compliance documents (Terms & Conditions, Privacy Policy, Imprint, Revocation) with custom versioning and draft/published statuses.
- **🚀 Dynamic App & Storefront Delivery:** Public Store APIs (`/store/legal-pages`, `/store/legal-pages/:slug`) allowing React Native mobile apps and Next.js storefronts to fetch compliance texts live without waiting for App Store or Google Play reviews.
- **🌐 Localization & Fallbacks:** Built-in locale support (`en`, `de`, `ku`) with automatic fallbacks to ensure legal screens are never blank.

---

## 📦 Installation

In your Medusa v2 backend project root:

```bash
npm install medusa-plugin-legal-pages
```

Or with yarn / pnpm:

```bash
yarn add medusa-plugin-legal-pages
# or
pnpm add medusa-plugin-legal-pages
```

---

## ⚙️ Configuration

Register the module in your `medusa-config.ts`:

```typescript
import { defineConfig } from "@medusajs/framework/utils"

module.exports = defineConfig({
  projectConfig: {
    // ... your project config
  },
  modules: [
    {
      resolve: "medusa-plugin-legal-pages",
    },
  ],
})
```

---

## 🗄️ Database Migrations

Run the database migration to create the `legal_page` table and indexes:

```bash
npx medusa db:migrate
```

---

## 🖥️ Medusa Admin Extension

To display the management screen in your Medusa Admin, create a route at `src/admin/routes/legal/page.tsx` in your Medusa backend:

```tsx
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
import LegalPagesAdmin from "medusa-plugin-legal-pages/admin" // or use the included component

export const config = defineRouteConfig({
  label: "Legal Pages",
  icon: DocumentText,
  rank: 25,
})

export default LegalPagesAdmin
```

---

## 📡 Store API Reference

The plugin provides public endpoints for web storefronts and mobile apps:

### 1. List All Published Legal Pages
```http
GET /store/legal-pages?locale=en
```

**Response (200 OK):**
```json
{
  "legal_pages": [
    {
      "id": "leg_01J8ABC...",
      "slug": "terms",
      "title": "Terms and Conditions (GTC)",
      "locale": "en",
      "version": "1.0",
      "updated_at": "2026-09-26T20:00:00.000Z"
    },
    {
      "id": "leg_01J8DEF...",
      "slug": "privacy-policy",
      "title": "Privacy Policy (GDPR)",
      "locale": "en",
      "version": "1.0",
      "updated_at": "2026-09-26T20:00:00.000Z"
    }
  ]
}
```


### 2. Retrieve Specific Legal Document (with Markdown Content)
```http
GET /store/legal-pages/:slug?locale=de
```

Example: `GET /store/legal-pages/agb`

**Response (200 OK):**
```json
{
  "legal_page": {
    "id": "leg_01J8ABC...",
    "slug": "agb",
    "title": "Allgemeine Geschäftsbedingungen",
    "content": "# Allgemeine Geschäftsbedingungen\n\n### § 1 Geltungsbereich...",
    "locale": "de",
    "is_published": true,
    "version": "1.0",
    "updated_at": "2026-09-26T20:00:00.000Z"
  }
}
```

---

## 📱 Mobile App (React Native / Expo) Usage Example

```typescript
// services/legal.ts
const MEDUSA_BACKEND_URL = "https://api.yourstore.com"

export const fetchLegalPage = async (slug: string, locale: string = "de") => {
  const res = await fetch(`${MEDUSA_BACKEND_URL}/store/legal-pages/${slug}?locale=${locale}`, {
    headers: {
      "x-publishable-api-key": process.env.EXPO_PUBLIC_MEDUSA_PUBLISHABLE_KEY!,
      "Accept": "application/json",
    },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.legal_page
}
```

---

## 🛠️ Contributing

Contributions and feedback are always welcome! Feel free to open an issue or submit a pull request.

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
