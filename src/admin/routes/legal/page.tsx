import { useState, useEffect, useCallback, useMemo } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Text,
  Badge,
  StatusBadge,
  Button,
  IconButton,
  Input,
  Label,
  Textarea,
  Switch,
  Table,
  Tabs,
  DropdownMenu,
  Drawer,
  toast,
  Divider,
  usePrompt,
  clx,
} from "@medusajs/ui"
import {
  DocumentText,
  Plus,
  Trash,
  Sparkles,
  ArrowPath,
  ArrowUpRightOnBox,
  Eye,
  PencilSquare,
  GlobeEurope,
} from "@medusajs/icons"

import kurdishFlagImg from "./kurdish-flag.png"

// Why: Structure representing a legal document retrieved from or sent to the Medusa legal module API.
// Tricky logic: Content contains raw Markdown string with headers, bullet lists, and paragraphs.
// TODO: Support rich JSON AST if rich-text visual block builders are introduced in the future.
interface LegalPageItem {
  id: string
  slug: string
  title: string
  content: string
  locale: string
  is_published: boolean
  version: string
  metadata?: Record<string, any>
  created_at?: string
  updated_at?: string
}

// Why: Definition of a language variant supported in the admin UI and store APIs.
export interface LanguageDefinition {
  code: string
  label: string
  flag: string
  note?: string
}

// Why: Renders the official Kurdish Ala Rengîn flag image for Kurdish variants (ku, ckb) or emoji/symbol for other languages.
// Tricky logic: Kurdish does not have an official unicode emoji flag on Apple/Android keyboards, so we render
// the high-resolution Kurdish flag PNG provided by the business to represent the language accurately.
export const renderLanguageFlag = (code: string, flagString?: string) => {
  if (code === "ku" || code === "ckb" || flagString === "kurdish-flag") {
    return (
      <img
        src={kurdishFlagImg}
        alt="Kurdî"
        className="inline-block h-3.5 w-auto max-w-[20px] object-contain align-middle rounded-[2px]"
      />
    )
  }
  return <span>{flagString || "🌐"}</span>
}

// Why: Catalog of common European and Middle Eastern languages for 1-click addition via Medusa DropdownMenu.
// Tricky logic: Includes both Kurdish dialects (Kurmancî 'ku' in Latin script, and Soranî 'ckb' in Arabic-Kurdish script)
// with the official Kurdish flag image.
// TODO: Add locale text direction metadata (ltr vs rtl) when expanding Arabic or Persian styling.
const PRESET_LANGUAGES: LanguageDefinition[] = [
  { code: "en", label: "English", flag: "🇬🇧", note: "International (Default)" },
  { code: "de", label: "Deutsch", flag: "🇩🇪", note: "BGB / DDG compliant" },
  { code: "ku", label: "Kurdî (Kurmancî)", flag: "kurdish-flag", note: "Latin script" },
  { code: "ckb", label: "Kurdî (Soranî)", flag: "kurdish-flag", note: "Arabic script" },
  { code: "ar", label: "العربية", flag: "🇸🇦", note: "Arabic" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱", note: "Netherlands" },
  { code: "sv", label: "Svenska", flag: "🇸🇪", note: "Sweden" },
  { code: "fr", label: "Français", flag: "🇫🇷", note: "France" },
  { code: "es", label: "Español", flag: "🇪🇸", note: "Spain" },
  { code: "it", label: "Italiano", flag: "🇮🇹", note: "Italy" },
  { code: "pl", label: "Polski", flag: "🇵🇱", note: "Poland" },
  { code: "fa", label: "فارسی", flag: "🇮🇷", note: "Persian" },
  { code: "da", label: "Dansk", flag: "🇩🇰", note: "Denmark" },
]

const LOCAL_STORAGE_CUSTOM_LANGUAGES_KEY = "medusa_legal_pages_custom_locales"

// Why: Renders formatted Markdown content into clean, accessible HTML preview elements without third-party heavy parser dependencies.
// Tricky logic: Parses block-level headers (###), horizontal dividers (---), bullet points (- / *), and inline bolding (**text**)
// using lightweight regular expressions to avoid hydration mismatches in Vite Admin runtime.
// TODO: Add support for markdown tables and embedded PDF links.
const MarkdownPreview = ({ content }: { content: string }) => {
  const renderedElements = useMemo(() => {
    if (!content) {
      return (
        <Text size="small" className="text-ui-fg-muted italic">
          No content yet. Start writing in the editor on the left.
        </Text>
      )
    }

    const lines = content.split("\n")
    const elements: JSX.Element[] = []
    let inList = false
    let listItems: string[] = []

    const flushList = (keyPrefix: number) => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${keyPrefix}`} className="list-disc pl-5 my-2 space-y-1 text-ui-fg-subtle">
            {listItems.map((item, idx) => (
              <li key={`li-${idx}`} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            ))}
          </ul>
        )
        listItems = []
        inList = false
      }
    }

    const formatInline = (text: string) => {
      return text
        .replace(/\*\*(.*?)\*\*/g, "<strong class='text-ui-fg-base font-semibold'>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em class='text-ui-fg-subtle'>$1</em>")
        .replace(/`([^`]+)`/g, "<code class='bg-ui-bg-subtle px-1 py-0.5 rounded text-xs'>$1</code>")
    }

    lines.forEach((rawLine, index) => {
      const line = rawLine.trim()

      if (line.startsWith("- ") || line.startsWith("* ")) {
        inList = true
        listItems.push(line.substring(2))
        return
      }

      if (inList) {
        flushList(index)
      }

      if (!line) {
        elements.push(<div key={`space-${index}`} className="h-2" />)
      } else if (line.startsWith("# ")) {
        elements.push(
          <Heading key={`h1-${index}`} level="h1" className="text-xl font-bold mt-4 mb-2 text-ui-fg-base">
            {line.substring(2)}
          </Heading>
        )
      } else if (line.startsWith("## ")) {
        elements.push(
          <Heading key={`h2-${index}`} level="h2" className="text-lg font-semibold mt-3 mb-1.5 text-ui-fg-base">
            {line.substring(3)}
          </Heading>
        )
      } else if (line.startsWith("### ")) {
        elements.push(
          <Heading key={`h3-${index}`} level="h3" className="text-base font-medium mt-2.5 mb-1 text-ui-fg-base">
            {line.substring(4)}
          </Heading>
        )
      } else if (line === "---") {
        elements.push(<Divider key={`div-${index}`} className="my-3 border-ui-border-base" />)
      } else {
        elements.push(
          <p
            key={`p-${index}`}
            className="text-sm leading-relaxed text-ui-fg-subtle mb-1.5"
            dangerouslySetInnerHTML={{ __html: formatInline(line) }}
          />
        )
      }
    })

    if (inList) {
      flushList(lines.length)
    }

    return elements
  }, [content])

  return (
    <div className="bg-ui-bg-subtle/50 p-6 rounded-lg border border-ui-border-base min-h-[420px] max-h-[700px] overflow-y-auto space-y-1">
      {renderedElements}
    </div>
  )
}

// Why: Main Admin dashboard screen built entirely with official @medusajs/ui components (Container, Table, Tabs, DropdownMenu, Drawer, usePrompt).
// Tricky logic: Pages are grouped by common 'slug'. Language tabs adapt dynamically: any locale present in the database
// or added by the merchant is rendered as an official Medusa Tab with the custom Kurdish flag image.
// TODO: Implement revision comparison modal to view side-by-side git-like diffs between document versions.
const LegalPagesAdmin = () => {
  const prompt = usePrompt()

  const [pages, setPages] = useState<LegalPageItem[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [selectedLocale, setSelectedLocale] = useState<string>("en")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  const [viewMode, setViewMode] = useState<"split" | "edit" | "preview">("split")

  // Custom user-defined ISO languages (excluding presets and 'tr')
  const [customLanguages, setCustomLanguages] = useState<LanguageDefinition[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_CUSTOM_LANGUAGES_KEY)
      if (!stored) return []
      const parsed: LanguageDefinition[] = JSON.parse(stored)
      const presetCodes = new Set(PRESET_LANGUAGES.map((p) => p.code))
      return parsed.filter((l) => l.code !== "tr" && !presetCodes.has(l.code))
    } catch {
      return []
    }
  })

  // Drawer states for creating documents and adding custom languages
  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newSlug, setNewSlug] = useState("")

  const [isAddingCustomLang, setIsAddingCustomLang] = useState(false)
  const [customCode, setCustomCode] = useState("")
  const [customLabel, setCustomLabel] = useState("")
  const [customFlag, setCustomFlag] = useState("🌐")

  // Form edit state
  const [formTitle, setFormTitle] = useState("")
  const [formSlug, setFormSlug] = useState("")
  const [formContent, setFormContent] = useState("")
  const [formIsPublished, setFormIsPublished] = useState(true)
  const [formVersion, setFormVersion] = useState("1.0")

  // Why: Fetch all legal documents from the custom admin API endpoint
  const fetchPages = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/admin/legal-pages", {
        credentials: "include",
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json()
      // Filter out any 'tr' language items if any existed
      const fetched: LegalPageItem[] = (data.legal_pages || []).filter((p: LegalPageItem) => p.locale !== "tr")
      setPages(fetched)

      // Auto-select first document group if none currently selected
      if (fetched.length > 0) {
        setSelectedGroupId((prev) => {
          const allGroupIds = new Set(fetched.map((p) => p.metadata?.group_id || p.slug))
          if (prev && allGroupIds.has(prev)) {
            return prev
          }
          return fetched[0].metadata?.group_id || fetched[0].slug
        })
      } else {
        setSelectedGroupId(null)
      }
    } catch (err: any) {
      toast.error("Failed to load", {
        description: err.message || "Could not fetch legal pages.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPages()
  }, [fetchPages])

  // Why: Resolves language metadata (label, flag, notes) from presets or custom storage
  // Tricky logic: Kurdish variants always render the Ala Rengîn flag image; Turkish is filtered out.
  const getLanguageDef = useCallback((code: string): LanguageDefinition => {
    const preset = PRESET_LANGUAGES.find((p) => p.code === code)
    if (preset) return preset
    const custom = customLanguages.find((c) => c.code === code)
    if (custom) return custom
    return {
      code,
      label: code.toUpperCase(),
      flag: code === "ku" || code === "ckb" ? "kurdish-flag" : "🌐",
    }
  }, [customLanguages])

  // Why: Persist custom languages to localStorage so added languages remain accessible across page refreshes
  const saveCustomLanguages = useCallback((updated: LanguageDefinition[]) => {
    const presetCodes = new Set(PRESET_LANGUAGES.map((p) => p.code))
    const filtered = updated.filter((l) => l.code !== "tr" && !presetCodes.has(l.code))
    setCustomLanguages(filtered)
    try {
      localStorage.setItem(LOCAL_STORAGE_CUSTOM_LANGUAGES_KEY, JSON.stringify(filtered))
    } catch (e) {
      console.warn("Failed to persist custom languages to localStorage", e)
    }
  }, [])

  // Why: 1-click start of a new language translation draft from the preset catalog via DropdownMenu
  const handleAddPresetLanguage = (preset: LanguageDefinition) => {
    setSelectedLocale(preset.code)
    toast.info(`Draft for '${preset.label}' started`, {
      description: `Create content for ${preset.label} (${preset.code.toUpperCase()}) and click 'Create Translation'.`,
    })
  }

  // Why: Allow store owners to register arbitrary language codes (e.g. 'da', 'pl', 'fa') via Drawer
  const handleSaveCustomLanguage = () => {
    const code = customCode.trim().toLowerCase()
    if (!code) {
      toast.error("Code required", { description: "Please enter a language code (e.g. 'da', 'ro')." })
      return
    }

    if (code === "tr") {
      toast.error("Not supported", { description: "Turkish language is not enabled." })
      return
    }

    const label = customLabel.trim() || code.toUpperCase()
    const flag = customFlag.trim() || "🌐"

    const newLang: LanguageDefinition = { code, label, flag }

    if (!customLanguages.some((l) => l.code === code)) {
      saveCustomLanguages([...customLanguages, newLang])
    }

    setSelectedLocale(code)
    setIsAddingCustomLang(false)
    setCustomCode("")
    setCustomLabel("")
    setCustomFlag("🌐")

    toast.success(`Language '${label}' activated`, {
      description: `Language '${code}' is now available as a tab.`,
    })
  }

  // Why: Group all fetched database rows by their document topic (metadata.group_id or canonical slug)
  // so all localized translations (e.g. 'impressum', 'imprint', 'agahiyen-qanuni') stay together under one document card.
  // Tricky logic: Impressum, Datenschutz and AGB are prioritized in the standard German legal ordering,
  // with German title and German slug used as the canonical group identifiers.
  const documentGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        groupId: string
        title: string
        canonicalSlug: string
        translations: Record<string, LegalPageItem>
        isAnyPublished: boolean
      }
    >()

    pages.forEach((page) => {
      if (page.locale === "tr") return
      const groupId = page.metadata?.group_id || page.slug
      const existing = map.get(groupId)
      if (existing) {
        existing.translations[page.locale] = page
        if (page.is_published) {
          existing.isAnyPublished = true
        }
        // English is the default baseline for document titles and canonical slugs; fallback to German
        if (page.locale === "en") {
          existing.title = page.title
          existing.canonicalSlug = page.slug
        } else if (page.locale === "de" && !existing.translations["en"]) {
          existing.title = page.title
          existing.canonicalSlug = page.slug
        }
      } else {
        map.set(groupId, {
          groupId,
          canonicalSlug: page.slug,
          title: page.title,
          translations: {
            [page.locale]: page,
          },
          isAnyPublished: page.is_published,
        })
      }
    })

    const order = ["imprint", "privacy-policy", "terms", "impressum", "datenschutz", "agb"]
    return Array.from(map.values()).sort((a, b) => {
      const aIndex = order.indexOf(a.groupId)
      const bIndex = order.indexOf(b.groupId)
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1
      return a.groupId.localeCompare(b.groupId)
    })
  }, [pages])

  // Active group based on selectedGroupId
  const activeGroup = useMemo(() => {
    return documentGroups.find((g) => g.groupId === selectedGroupId) || null
  }, [documentGroups, selectedGroupId])

  // Active document for the selected language
  const activePage = useMemo(() => {
    if (!activeGroup) return null
    return activeGroup.translations[selectedLocale] || null
  }, [activeGroup, selectedLocale])

  // Why: Reference page for pre-filling translation templates when drafting a new locale.
  // Tricky logic: Prefers the English default ('en'), and falls back to German ('de') if English does not exist.
  // TODO: Allow merchant to select any existing translation as baseline.
  const referencePage = useMemo(() => {
    if (!activeGroup) return null
    return activeGroup.translations["en"] || activeGroup.translations["de"] || null
  }, [activeGroup])

  // Active language definition object
  const currentLangDef = useMemo(() => {
    return getLanguageDef(selectedLocale)
  }, [getLanguageDef, selectedLocale])

  // Why: Only render tabs for languages that actually have a saved translation for this document,
  // PLUS the currently active tab if the merchant is drafting a new translation.
  // Tricky logic: When a user deletes a translation version, switching selectedLocale back to 'de'
  // immediately causes that deleted language tab to disappear completely from the bar.
  // No ghost tabs with '+ Neu' stay behind!
  const visibleTabs = useMemo<LanguageDefinition[]>(() => {
    if (!activeGroup) return []
    const map = new Map<string, LanguageDefinition>()

    // 1. Existing saved translations for this specific document
    Object.keys(activeGroup.translations).forEach((loc) => {
      if (loc !== "tr") {
        map.set(loc, getLanguageDef(loc))
      }
    })

    // 2. English ('en') is the default international compliance language, always present as the primary base tab
    if (!map.has("en")) {
      map.set("en", getLanguageDef("en"))
    }

    // 3. If merchant just initiated a new translation draft via '+ Sprache hinzufügen', display it as an active draft tab
    if (selectedLocale && !map.has(selectedLocale) && selectedLocale !== "tr") {
      map.set(selectedLocale, getLanguageDef(selectedLocale))
    }

    // Sort order: English first, German second, Kurdish Kurmancî third, Kurdish Soranî fourth, then alphabetical
    const priority = ["en", "de", "ku", "ckb"]
    return Array.from(map.values()).sort((a, b) => {
      const aIdx = priority.indexOf(a.code)
      const bIdx = priority.indexOf(b.code)
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
      if (aIdx !== -1) return -1
      if (bIdx !== -1) return 1
      return a.label.localeCompare(b.label)
    })
  }, [activeGroup, getLanguageDef, selectedLocale])

  // Why: Only show languages in the '+ Sprache hinzufügen' dropdown that do NOT yet exist on this document
  const availableLanguagesToAdd = useMemo(() => {
    if (!activeGroup) return []
    const existingLocales = new Set(Object.keys(activeGroup.translations))

    // Combine preset languages and any custom languages, excluding Turkish and already existing locales
    const catalog = [...PRESET_LANGUAGES]
    customLanguages.forEach((cl) => {
      if (!catalog.some((p) => p.code === cl.code)) {
        catalog.push(cl)
      }
    })

    return catalog.filter((l) => l.code !== "tr" && !existingLocales.has(l.code))
  }, [activeGroup, customLanguages])

  // Why: Synchronize form fields whenever active document group or language tab changes
  // Tricky logic: Pre-populates intelligent localized default slug (e.g. 'imprint' for EN, 'agahiyen-qanuni' for KU)
  // when drafting a new translation, while still allowing the storeowner to freely change the slug for ANY page.
  useEffect(() => {
    if (activePage) {
      setFormTitle(activePage.title)
      setFormSlug(activePage.slug)
      setFormContent(activePage.content)
      setFormIsPublished(activePage.is_published)
      setFormVersion(activePage.version || "1.0")
    } else if (activeGroup) {
      // New translation draft
      const defaultTitle = referencePage ? `${referencePage.title} (${currentLangDef.label})` : activeGroup.title
      setFormTitle(defaultTitle)
      
      // Propose an intelligent localized slug for the new language, but merchant can freely edit
      let proposedSlug = activeGroup.canonicalSlug
      if (selectedLocale === "en") {
        if (activeGroup.groupId === "impressum" || activeGroup.groupId === "imprint") proposedSlug = "imprint"
        else if (activeGroup.groupId === "datenschutz" || activeGroup.groupId === "privacy-policy") proposedSlug = "privacy-policy"
        else if (activeGroup.groupId === "agb" || activeGroup.groupId === "terms") proposedSlug = "terms"
      } else if (selectedLocale === "de") {
        if (activeGroup.groupId === "imprint" || activeGroup.groupId === "impressum") proposedSlug = "impressum"
        else if (activeGroup.groupId === "privacy-policy" || activeGroup.groupId === "datenschutz") proposedSlug = "datenschutz"
        else if (activeGroup.groupId === "terms" || activeGroup.groupId === "agb") proposedSlug = "agb"
      } else if (selectedLocale === "ku") {
        if (activeGroup.groupId === "imprint" || activeGroup.groupId === "impressum") proposedSlug = "agahiyen-qanuni"
        else if (activeGroup.groupId === "privacy-policy" || activeGroup.groupId === "datenschutz") proposedSlug = "parastina-daneyan"
        else if (activeGroup.groupId === "terms" || activeGroup.groupId === "agb") proposedSlug = "mercen-gisti"
      }
      setFormSlug(proposedSlug)
      setFormContent("")
      setFormIsPublished(true)
      setFormVersion("1.0")
    }
  }, [activePage, activeGroup, selectedLocale, referencePage, currentLangDef])

  // Why: Detect unsaved changes compared to server baseline
  const hasChanges = useMemo(() => {
    if (!activeGroup) return false
    if (!activePage) {
      return (
        formContent.trim().length > 0 ||
        formSlug.trim().length > 0 ||
        (formTitle.trim().length > 0 && formTitle !== `${referencePage?.title} (${currentLangDef.label})`)
      )
    }
    return (
      formTitle !== activePage.title ||
      formSlug !== activePage.slug ||
      formContent !== activePage.content ||
      formIsPublished !== activePage.is_published ||
      formVersion !== activePage.version
    )
  }, [activeGroup, activePage, formTitle, formSlug, formContent, formIsPublished, formVersion, referencePage, currentLangDef])

  // Why: Seed default boilerplate templates for the store
  const handleSeedDefaults = async () => {
    setIsSeeding(true)
    try {
      const res = await fetch("/admin/legal-pages/seed-defaults", {
        method: "POST",
        credentials: "include",
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json()
      toast.success("Default templates loaded", {
        description: `${data.legal_pages?.length || 0} legal documents were successfully initialized.`,
      })
      await fetchPages()
    } catch (err: any) {
      toast.error("Initialization failed", {
        description: err.message,
      })
    } finally {
      setIsSeeding(false)
    }
  }

  // Why: Copy reference content (English or German baseline) into the editor to simplify line-by-line translation
  const handleCopyReferenceBaseline = () => {
    if (!referencePage) return
    setFormContent(referencePage.content)
    toast.info("Template copied", {
      description: `Content from ${referencePage.locale.toUpperCase()} was inserted into the editor.`,
    })
  }

  // Why: Save changes to active translation or create a new language translation row in the database
  // Tricky logic: Always transmits cleaned localized slug and preserves metadata.group_id so languages stay linked
  const handleSave = async () => {
    if (!activeGroup) return
    if (!formTitle.trim()) {
      toast.error("Title required", { description: "Please enter a document title." })
      return
    }

    const cleanSlug = (formSlug.trim() || formTitle.trim())
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/(^-|-$)+/g, "")

    if (!cleanSlug) {
      toast.error("URL slug required", { description: "Please enter a valid URL slug." })
      return
    }

    setIsSaving(true)
    try {
      if (activePage) {
        // Update existing document
        const res = await fetch(`/admin/legal-pages/${activePage.id}`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle.trim(),
            slug: cleanSlug,
            content: formContent,
            locale: selectedLocale,
            is_published: formIsPublished,
            version: formVersion.trim(),
            metadata: {
              ...(activePage.metadata || {}),
              group_id: activeGroup.groupId,
            },
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.message || `HTTP ${res.status}`)
        }

        toast.success("Successfully saved", {
          description: `'${formTitle}' (${cleanSlug} · ${selectedLocale.toUpperCase()}) was updated.`,
        })
      } else {
        // Create new language translation
        const res = await fetch("/admin/legal-pages", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle.trim(),
            slug: cleanSlug,
            content: formContent || `# ${formTitle.trim()}\n\nInsert content here...`,
            locale: selectedLocale,
            is_published: formIsPublished,
            version: formVersion.trim() || "1.0",
            metadata: {
              group_id: activeGroup.groupId,
            },
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.message || `HTTP ${res.status}`)
        }

        toast.success("Translation created", {
          description: `'${formTitle}' (${cleanSlug} · ${selectedLocale.toUpperCase()}) was successfully created.`,
        })
      }

      await fetchPages()
    } catch (err: any) {
      toast.error("Save failed", {
        description: err.message,
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Why: Discard unsaved changes in the editor or cancel a draft translation tab
  const handleDiscard = () => {
    if (activePage) {
      setFormTitle(activePage.title)
      setFormSlug(activePage.slug)
      setFormContent(activePage.content)
      setFormIsPublished(activePage.is_published)
      setFormVersion(activePage.version)
    } else if (activeGroup) {
      // Discarding a new draft translation tab: return to English so the draft tab closes immediately
      setSelectedLocale("en")
      setFormContent("")
    }
  }

  // Why: Create an entirely new legal page topic (e.g. 'Cancellation Policy') via Drawer
  const handleCreateNew = async () => {
    if (!newTitle.trim()) {
      toast.error("Title required", { description: "Please enter a title." })
      return
    }

    setIsSaving(true)
    try {
      const derivedSlug = (newSlug.trim() || newTitle.trim())
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")

      const res = await fetch("/admin/legal-pages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          slug: derivedSlug,
          content: `# ${newTitle.trim()}\n\nInsert legal text here...`,
          locale: "en",
          is_published: true,
          version: "1.0",
          metadata: {
            group_id: derivedSlug,
          },
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `HTTP ${res.status}`)
      }

      toast.success("Page created", { description: `'${newTitle}' has been created.` })
      setIsCreating(false)
      setNewTitle("")
      setNewSlug("")
      await fetchPages()
      setSelectedGroupId(derivedSlug)
      setSelectedLocale("en")
    } catch (err: any) {
      toast.error("Creation failed", { description: err.message })
    } finally {
      setIsSaving(false)
    }
  }

  // Why: Delete the active language translation using Medusa's official usePrompt modal
  // Tricky logic: Switches selectedLocale back to 'en' immediately so the deleted tab is not left
  // as an empty draft. VisibleTabs automatically excludes the deleted language.
  const handleDelete = async () => {
    if (!activePage) return
    const isOnlyTranslation = Object.keys(activeGroup?.translations || {}).length <= 1

    const confirmed = await prompt({
      title: isOnlyTranslation ? "Delete Document" : "Delete Translation",
      description: isOnlyTranslation
        ? `Are you sure you want to permanently delete '${activePage.title}' and all its translations?`
        : `Are you sure you want to delete the '${activePage.title}' (${selectedLocale.toUpperCase()}) translation? Other language versions will remain intact.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    })

    if (!confirmed) return

    setIsSaving(true)
    try {
      const res = await fetch(`/admin/legal-pages/${activePage.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      toast.success("Deleted", { description: `'${activePage.title}' has been removed.` })

      // Clean up from customLanguages if it was a custom added language
      const deletedLocale = selectedLocale
      const remainingCustom = customLanguages.filter((l) => l.code !== deletedLocale)
      saveCustomLanguages(remainingCustom)

      // Always switch active tab back to English ('en') so the deleted language tab immediately disappears
      setSelectedLocale("en")
      await fetchPages()
    } catch (err: any) {
      toast.error("Delete failed", { description: err.message })
    } finally {
      setIsSaving(false)
    }
  }

  // Quick markdown insertion helper
  const insertMarkdownSnippet = (snippet: string) => {
    setFormContent((prev) => prev + "\n" + snippet)
  }

  return (
    <div className="flex flex-col gap-6 p-8 max-w-7xl mx-auto">
      {/* 1. Header Section: Native Medusa Container divide-y */}
      <Container className="divide-y p-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ui-bg-subtle text-ui-fg-subtle border border-ui-border-base">
              <DocumentText className="h-5 w-5 text-ui-fg-interactive" />
            </div>
            <div>
              <Heading level="h1" className="text-xl font-semibold text-ui-fg-base">
                Legal Pages & Compliance
              </Heading>
              <Text size="small" className="text-ui-fg-subtle mt-0.5">
                Centralized management of Legal Notice, Privacy Policy, and Terms for web store and mobile app.
              </Text>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="small"
              onClick={() => setIsCreating(true)}
              className="gap-1.5"
            >
              <Plus /> New Document
            </Button>
            <IconButton
              variant="transparent"
              size="small"
              onClick={fetchPages}
              isLoading={isLoading}
              title="Refresh"
            >
              <ArrowPath />
            </IconButton>
          </div>
        </div>
      </Container>

      {/* 2. Documents Section: Native Medusa Table inside Container */}
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h2">Documents</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Select a legal document from the list to manage its translations
            </Text>
          </div>
          <Badge color="grey" size="small">
            {documentGroups.length} {documentGroups.length === 1 ? "Document" : "Documents"}
          </Badge>
        </div>

        {documentGroups.length === 0 && !isLoading ? (
          <div className="p-12 text-center">
            <Text size="small" className="text-ui-fg-subtle mb-4">
              No legal documents created yet. Start by creating your first document (e.g. Terms of Service, Privacy Policy).
            </Text>
            <Button variant="primary" size="small" onClick={() => setIsCreating(true)} className="gap-1.5">
              <Plus /> Create First Document
            </Button>
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Title</Table.HeaderCell>
                <Table.HeaderCell>URL Slug</Table.HeaderCell>
                <Table.HeaderCell>Languages</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Action</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {documentGroups.map((group) => {
                const isSelected = group.groupId === selectedGroupId
                return (
                  <Table.Row
                    key={group.groupId}
                    onClick={() => setSelectedGroupId(group.groupId)}
                    className={clx("cursor-pointer transition-colors", {
                      "bg-ui-bg-subtle-hover": isSelected,
                    })}
                  >
                    <Table.Cell className="font-medium text-ui-fg-base">
                      <div className="flex items-center gap-2">
                        <DocumentText className="text-ui-fg-muted h-4 w-4" />
                        <span>{group.title}</span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-col gap-0.5">
                        <code className="text-xs bg-ui-bg-subtle text-ui-fg-subtle px-1.5 py-0.5 rounded font-mono w-fit">
                          /{group.canonicalSlug}
                        </code>
                        {Object.keys(group.translations).length > 1 && (
                          <span className="text-[10px] text-ui-fg-muted font-mono">
                            {Object.values(group.translations)
                              .map((t) => `${t.locale}: /${t.slug}`)
                              .join(" · ")}
                          </span>
                        )}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {Object.entries(group.translations).map(([locale, trans]) => {
                          if (locale === "tr" || !trans) return null
                          const langDef = getLanguageDef(locale)
                          return (
                            <Badge
                              key={locale}
                              color={trans.is_published ? "green" : "grey"}
                              size="small"
                              className="gap-1 items-center"
                              title={`${langDef.label} (${trans.is_published ? "Published" : "Draft"})`}
                            >
                              {renderLanguageFlag(locale, langDef.flag)}
                              <span>{locale.toUpperCase()}</span>
                            </Badge>
                          )
                        })}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge color={group.isAnyPublished ? "green" : "grey"}>
                        {group.isAnyPublished ? "Active" : "Draft"}
                      </StatusBadge>
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <Button
                        size="small"
                        variant={isSelected ? "primary" : "secondary"}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedGroupId(group.groupId)
                        }}
                      >
                        {isSelected ? "Selected" : "Edit"}
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table>
        )}
      </Container>

      {/* 3. Detail & Translation Editor Section: Native Medusa Container divide-y */}
      {activeGroup && (
        <Container className="divide-y p-0">
          {/* Section Header with Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4">
            <div>
              <div className="flex items-center gap-2">
                <Heading level="h2">{activeGroup.title}</Heading>
                <code className="text-xs bg-ui-bg-subtle text-ui-fg-muted px-1.5 py-0.5 rounded font-mono">
                  /{formSlug || activeGroup.canonicalSlug}
                </code>
              </div>
              <Text size="small" className="text-ui-fg-subtle mt-0.5">
                Select a language tab or add a new translation
              </Text>
            </div>

            <div className="flex items-center gap-2">
              {activePage && (
                <Button variant="danger" size="small" onClick={handleDelete} disabled={isSaving}>
                  <Trash /> Delete version
                </Button>
              )}
              {hasChanges && (
                <Button variant="secondary" size="small" onClick={handleDiscard} disabled={isSaving}>
                  Discard
                </Button>
              )}
              <Button
                variant="primary"
                size="small"
                onClick={handleSave}
                isLoading={isSaving}
                disabled={!hasChanges && Boolean(activePage)}
              >
                {activePage ? "Save" : "Create Translation"}
              </Button>
            </div>
          </div>

          {/* Native Medusa Tabs for Languages + DropdownMenu for Adding Languages */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3 bg-ui-bg-subtle/30">
            <Tabs value={selectedLocale} onValueChange={setSelectedLocale}>
              <Tabs.List>
                {visibleTabs.map((lang) => {
                  const trans = activeGroup.translations[lang.code]
                  const exists = Boolean(trans)
                  return (
                    <Tabs.Trigger key={lang.code} value={lang.code} className="gap-2 items-center">
                      {renderLanguageFlag(lang.code, lang.flag)}
                      <span>{lang.label}</span>
                      {exists ? (
                        <StatusBadge color={trans.is_published ? "green" : "grey"} />
                      ) : (
                        <Badge size="small" color="orange">
                          Draft
                        </Badge>
                      )}
                    </Tabs.Trigger>
                  )
                })}
              </Tabs.List>
            </Tabs>

            {/* Native Medusa DropdownMenu to add languages */}
            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <Button variant="secondary" size="small" className="gap-1.5">
                  <Plus /> Add Language
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                <DropdownMenu.Label>Select Language</DropdownMenu.Label>
                <DropdownMenu.Group>
                  {availableLanguagesToAdd.length === 0 ? (
                    <div className="p-2 text-xs text-ui-fg-muted italic">
                      All languages have been added
                    </div>
                  ) : (
                    availableLanguagesToAdd.map((preset) => (
                      <DropdownMenu.Item
                        key={preset.code}
                        onClick={() => handleAddPresetLanguage(preset)}
                        className="gap-2 items-center"
                      >
                        {renderLanguageFlag(preset.code, preset.flag)}
                        <span>{preset.label}</span>
                        <Text size="xsmall" className="text-ui-fg-muted font-mono uppercase ml-auto">
                          {preset.code}
                        </Text>
                      </DropdownMenu.Item>
                    ))
                  )}
                </DropdownMenu.Group>
                <DropdownMenu.Separator />
                <DropdownMenu.Item onClick={() => setIsAddingCustomLang(true)} className="gap-2 items-center">
                  <GlobeEurope /> Define custom language (ISO)...
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>
          </div>

          {/* Missing translation banner */}
          {!activePage && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 bg-ui-bg-subtle/80">
              <div>
                <div className="flex items-center gap-1.5 font-semibold text-ui-fg-base">
                  {renderLanguageFlag(currentLangDef.code, currentLangDef.flag)}
                  <Text size="small" className="font-semibold text-ui-fg-base">
                    {currentLangDef.label} ({selectedLocale.toUpperCase()}) has not been created yet
                  </Text>
                </div>
                <Text size="small" className="text-ui-fg-subtle mt-0.5">
                  You can copy the reference template as a translation aid or start writing directly.
                </Text>
              </div>
              <div className="flex items-center gap-2">
                {referencePage && (
                  <Button variant="secondary" size="small" onClick={handleCopyReferenceBaseline}>
                    {renderLanguageFlag(referencePage.locale, getLanguageDef(referencePage.locale).flag)}{" "}
                    Copy {referencePage.locale.toUpperCase()} Template
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setSelectedLocale("en")}
                  title="Discard this draft and close tab"
                >
                  Cancel Draft
                </Button>
                <Button variant="primary" size="small" onClick={handleSave} isLoading={isSaving}>
                  Create Translation
                </Button>
              </div>
            </div>
          )}

          {/* Form Fields: Native Medusa Label, Input, Switch */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6">
            <div className="md:col-span-6 space-y-1">
              <div className="flex items-center gap-1.5">
                <Label size="small">Title ({currentLangDef.label})</Label>
                {renderLanguageFlag(currentLangDef.code, currentLangDef.flag)}
              </div>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Legal Notice / Imprint"
              />
            </div>

            <div className="md:col-span-3 space-y-1">
              <div className="flex items-center justify-between">
                <Label size="small">URL Slug (unique)</Label>
                <Text size="xsmall" className="text-ui-fg-muted font-mono">
                  /{formSlug.trim() || "slug"}
                </Text>
              </div>
              <Input
                value={formSlug}
                onChange={(e) => {
                  // Why: Automatically convert spaces or invalid URI characters into URL-safe kebab-case
                  // Tricky logic: Allows store managers to freely customize the URL slug for ANY language (e.g. imprint, privacy-policy)
                  const clean = e.target.value
                    .toLowerCase()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-z0-9-_]/g, "")
                  setFormSlug(clean)
                }}
                placeholder="e.g. imprint, privacy-policy"
                className="font-mono text-xs"
              />
            </div>

            <div className="md:col-span-3 flex items-center justify-between sm:justify-end gap-4 pt-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formIsPublished}
                  onCheckedChange={setFormIsPublished}
                  id="pub-switch"
                />
                <Label htmlFor="pub-switch" size="small" className="cursor-pointer">
                  {formIsPublished ? "Published" : "Draft"}
                </Label>
              </div>

              <a
                href={`/store/legal-pages/${formSlug || activeGroup.canonicalSlug}?locale=${selectedLocale}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-ui-fg-interactive hover:underline"
                title="View Public API JSON"
              >
                API <ArrowUpRightOnBox className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Editor Toolbar & View Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-ui-bg-subtle/40 border-t border-ui-border-base">
            <div className="flex flex-wrap items-center gap-1">
              <Text size="small" className="text-ui-fg-muted mr-1 font-medium">Insert:</Text>
              <Button
                variant="transparent"
                size="small"
                className="h-7 px-2 text-xs"
                onClick={() => insertMarkdownSnippet("## Section Heading")}
              >
                H2
              </Button>
              <Button
                variant="transparent"
                size="small"
                className="h-7 px-2 text-xs"
                onClick={() => insertMarkdownSnippet("### Subsection")}
              >
                H3
              </Button>
              <Button
                variant="transparent"
                size="small"
                className="h-7 px-2 text-xs font-bold"
                onClick={() => insertMarkdownSnippet("**Important Note:**")}
              >
                Bold
              </Button>
              <Button
                variant="transparent"
                size="small"
                className="h-7 px-2 text-xs"
                onClick={() => insertMarkdownSnippet("- Item 1\n- Item 2")}
              >
                • List
              </Button>
              <Button
                variant="transparent"
                size="small"
                className="h-7 px-2 text-xs"
                onClick={() => insertMarkdownSnippet("---")}
              >
                Divider
              </Button>
            </div>

            <div className="flex items-center gap-1 bg-ui-bg-base border border-ui-border-base rounded-md p-0.5">
              <Button
                size="small"
                variant={viewMode === "split" ? "secondary" : "transparent"}
                className="h-6 px-2 text-xs gap-1"
                onClick={() => setViewMode("split")}
              >
                <PencilSquare className="h-3 w-3" /> Split
              </Button>
              <Button
                size="small"
                variant={viewMode === "edit" ? "secondary" : "transparent"}
                className="h-6 px-2 text-xs gap-1"
                onClick={() => setViewMode("edit")}
              >
                <PencilSquare className="h-3 w-3" /> Editor
              </Button>
              <Button
                size="small"
                variant={viewMode === "preview" ? "secondary" : "transparent"}
                className="h-6 px-2 text-xs gap-1"
                onClick={() => setViewMode("preview")}
              >
                <Eye className="h-3 w-3" /> Preview
              </Button>
            </div>
          </div>

          {/* Main Content Workspace: Textarea & MarkdownPreview */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6">
            {(viewMode === "split" || viewMode === "edit") && (
              <div className={viewMode === "split" ? "md:col-span-6 space-y-2" : "md:col-span-12 space-y-2"}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label size="small">Markdown Text</Label>
                    <Badge size="small" color="grey" className="gap-1 items-center">
                      {renderLanguageFlag(selectedLocale, currentLangDef.flag)}
                      <span>{selectedLocale.toUpperCase()}</span>
                    </Badge>
                  </div>
                  <Text size="xsmall" className="text-ui-fg-muted font-mono">
                    {formContent.length} chars · ~{formContent.split(/\s+/).filter(Boolean).length} words
                  </Text>
                </div>
                <Textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="# Heading..."
                  rows={20}
                  className="font-mono text-xs leading-relaxed w-full resize-y min-h-[420px]"
                />
              </div>
            )}

            {(viewMode === "split" || viewMode === "preview") && (
              <div className={viewMode === "split" ? "md:col-span-6 space-y-2" : "md:col-span-12 space-y-2"}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Label size="small">Preview ({currentLangDef.label})</Label>
                    {renderLanguageFlag(currentLangDef.code, currentLangDef.flag)}
                  </div>
                  <Badge size="small" color="grey">
                    Customer View
                  </Badge>
                </div>
                <MarkdownPreview content={formContent} />
              </div>
            )}
          </div>
        </Container>
      )}

      {/* 4. Native Medusa Drawer for Creating New Legal Documents */}
      <Drawer open={isCreating} onOpenChange={setIsCreating}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Create New Legal Document</Drawer.Title>
            <Drawer.Description>
              Create a new compliance document (e.g. Cancellation Policy)
            </Drawer.Description>
          </Drawer.Header>
          <Drawer.Body className="space-y-4 p-6">
            <div className="space-y-1">
              <Label size="small">Document Title *</Label>
              <Input
                placeholder="e.g. Cancellation Policy"
                value={newTitle}
                onChange={(e) => {
                  setNewTitle(e.target.value)
                  if (!newSlug) {
                    setNewSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)+/g, "")
                    )
                  }
                }}
              />
            </div>
            <div className="space-y-1">
              <Label size="small">URL Slug</Label>
              <Input
                placeholder="e.g. cancellation-policy"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </Drawer.Body>
          <Drawer.Footer className="flex justify-end gap-2 p-6 border-t border-ui-border-base">
            <Drawer.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </Drawer.Close>
            <Button variant="primary" onClick={handleCreateNew} isLoading={isSaving}>
              Create Document
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>

      {/* 5. Native Medusa Drawer for Adding Custom Languages */}
      <Drawer open={isAddingCustomLang} onOpenChange={setIsAddingCustomLang}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Add Custom Language</Drawer.Title>
            <Drawer.Description>
              Define any ISO language code or regional dialect
            </Drawer.Description>
          </Drawer.Header>
          <Drawer.Body className="space-y-4 p-6">
            <div className="space-y-1">
              <Label size="small">ISO Language Code (e.g. da, ro, fa) *</Label>
              <Input
                placeholder="e.g. da"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label size="small">Display Name *</Label>
              <Input
                placeholder="e.g. Dansk (Danish)"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label size="small">Flag / Symbol</Label>
              <Input
                placeholder="🇩🇰 or 🌐"
                value={customFlag}
                onChange={(e) => setCustomFlag(e.target.value)}
              />
            </div>
          </Drawer.Body>
          <Drawer.Footer className="flex justify-end gap-2 p-6 border-t border-ui-border-base">
            <Drawer.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </Drawer.Close>
            <Button variant="primary" onClick={handleSaveCustomLanguage}>
              Activate Language
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </div>
  )
}

// Why: Medusa v2 Admin Route Configuration adding this page to the main navigation menu
export const config = defineRouteConfig({
  label: "Legal Pages",
  icon: DocumentText,
  rank: 25,
})

export default LegalPagesAdmin
