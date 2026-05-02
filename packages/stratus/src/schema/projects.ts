import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { user } from "./users"

export const projectTypeEnum = pgEnum("project_type", ["server", "plugin", "mod"])

export const projects = pgTable("pulsify_projects", {
	id: uuid("id").primaryKey().defaultRandom(),
	ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	type: projectTypeEnum("type").notNull(),
	description: text("description"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
})
