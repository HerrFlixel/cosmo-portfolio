import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { CATEGORIES } from "../categories";

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;
const createdAt = () => text("created_at").notNull().default(now);

export const portfolioImages = sqliteTable(
  "portfolio_images",
  {
    id: text("id").primaryKey(),
    category: text("category", { enum: CATEGORIES }).notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    color: text("color").notNull(),
    altDe: text("alt_de"),
    altEn: text("alt_en"),
    sort: integer("sort").notNull().default(0),
    visible: integer("visible", { mode: "boolean" }).notNull().default(true),
    role: text("role", { enum: ["hero", "chapter", "chapter_preview"] }),
    createdAt: createdAt(),
  },
  (t) => [index("portfolio_images_category_sort_idx").on(t.category, t.sort)],
);

export const galleries = sqliteTable("galleries", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  shootDate: text("shoot_date"),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  passwordCipher: text("password_cipher").notNull().default(""),
  expiresAt: text("expires_at"),
  status: text("status", { enum: ["draft", "online"] }).notNull().default("draft"),
  coverImageId: text("cover_image_id"),
  createdAt: createdAt(),
  updatedAt: text("updated_at").notNull().default(now).$onUpdate(() => now),
});

export const galleryImages = sqliteTable(
  "gallery_images",
  {
    id: text("id").primaryKey(),
    galleryId: text("gallery_id")
      .notNull()
      .references(() => galleries.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    bytes: integer("bytes").notNull(),
    crc32: integer("crc32").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    color: text("color").notNull(),
    sort: integer("sort").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("gallery_images_gallery_sort_idx").on(t.galleryId, t.sort)],
);

export const favorites = sqliteTable(
  "favorites",
  {
    galleryId: text("gallery_id")
      .notNull()
      .references(() => galleries.id, { onDelete: "cascade" }),
    imageId: text("image_id")
      .notNull()
      .references(() => galleryImages.id, { onDelete: "cascade" }),
    visitorName: text("visitor_name").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.galleryId, t.imageId, t.visitorName] })],
);

export const GALLERY_EVENT_TYPES = [
  "view",
  "download_image",
  "download_zip",
  "favorite_add",
  "favorite_remove",
] as const;

export const galleryEvents = sqliteTable(
  "gallery_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    galleryId: text("gallery_id")
      .notNull()
      .references(() => galleries.id, { onDelete: "cascade" }),
    type: text("type", { enum: GALLERY_EVENT_TYPES }).notNull(),
    visitorName: text("visitor_name"),
    imageId: text("image_id"),
    zipPart: integer("zip_part"),
    createdAt: createdAt(),
  },
  (t) => [index("gallery_events_gallery_created_idx").on(t.galleryId, t.createdAt)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/** Versuche beim Öffnen einer Galerie bzw. beim Galerie-Code; richtige werden wieder gelöscht (Bremse, Plan 6). */
export const unlockFailures = sqliteTable(
  "unlock_failures",
  {
    key: text("key").notNull(),
    at: integer("at").notNull(),
  },
  // at: Aufräumen alter Einträge ohne Scan der ganzen Tabelle.
  (t) => [index("unlock_failures_key_at_idx").on(t.key, t.at), index("unlock_failures_at_idx").on(t.at)],
);
