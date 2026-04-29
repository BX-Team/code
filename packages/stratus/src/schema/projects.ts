import { pgTable, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core"
import { users } from "./users"

export const projectTypeEnum = pgEnum("project_type", ["server", "plugin", "mod"])

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  type: projectTypeEnum("type").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})