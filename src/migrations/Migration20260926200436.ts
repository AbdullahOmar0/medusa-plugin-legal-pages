import { Migration } from "@medusajs/framework/mikro-orm/migrations";

// Why: Database migration generating the legal_page table with unique indexes for slug lookups.
// Tricky logic: Soft deletes use partial indexes where deleted_at IS NULL so deactivated or drafted
// pages don't block reusing standard slugs like 'agb' or 'datenschutz' in future revisions.
// TODO: Add locale composite index if multi-language legal docs require duplicated slugs with different locales.
export class Migration20260926200436 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "legal_page" drop constraint if exists "legal_page_slug_unique";`);
    this.addSql(`create table if not exists "legal_page" ("id" text not null, "slug" text not null, "title" text not null, "content" text not null, "locale" text not null default 'de', "is_published" boolean not null default true, "version" text not null default '1.0', "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "legal_page_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_legal_page_slug_locale_unique" ON "legal_page" ("slug", "locale") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_LEGAL_PAGE_SLUG" ON "legal_page" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_legal_page_locale" ON "legal_page" ("locale") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_legal_page_deleted_at" ON "legal_page" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "legal_page" cascade;`);
  }

}
