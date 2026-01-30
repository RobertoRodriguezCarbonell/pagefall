import { relations, sql } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index, jsonb } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const notebooks = pgTable("notebooks", {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()),
  updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date())
});

export const notebookRelations = relations(notebooks, ({ many, one }) => ({
  notes: many(notes),
  tasks: many(tasks),
  apiKeys: many(apiKeys),
  user: one(user, {
    fields: [notebooks.userId],
    references: [user.id]
  })
}));

export const apiKeys = pgTable("api_keys", {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  key: text('key').notNull().unique(), // pf_...
  permission: text('permission').notNull().default('read_only'), // 'read_only' | 'full_access'
  notebookId: text('notebook_id').notNull().references(() => notebooks.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()),
  lastUsedAt: timestamp('last_used_at'),
});

export const apiKeyRelations = relations(apiKeys, ({ one }) => ({
  notebook: one(notebooks, {
    fields: [apiKeys.notebookId],
    references: [notebooks.id]
  })
}));

export const settings = pgTable("settings", {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
  openAIApiKey: text('openai_api_key'),
  createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()),
  updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date())
})

export const settingsRelations = relations(settings, ({ one }) => ({
  user: one(user, {
    fields: [settings.userId],
    references: [user.id],
  }),
}));

export type Notebook = typeof notebooks.$inferSelect & {
  notes: Note[];
  tasks: Task[];
};
export type InsertNotebook = typeof notebooks.$inferInsert;

export const notes = pgTable("notes", {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  title: text('title').notNull(),
  content: jsonb('content').notNull(),
  notebookId: text('notebook_id').notNull().references(() => notebooks.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()),
  updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date())
});

export const noteRelations = relations(notes, ({ one, many }) => ({
  notebook: one(notebooks, {
    fields: [notes.notebookId],
    references: [notebooks.id]
  }),
  comments: many(comments)
}));

export const comments = pgTable("comments", {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  content: text('content').notNull(),
  noteId: text('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }), // 👈 Añadido: Saber quién hizo el comentario

  // Para vincular el comentario con una selección de texto específica
  selectionText: text('selection_text'), // 👈 Opcional: El texto que se seleccionó al comentar
  selectionStart: text('selection_start'), // 👈 Opcional: Posición inicial de la selección (puedes usar JSON si necesitas más precisión)
  selectionEnd: text('selection_end'), // 👈 Opcional: Posición final

  resolved: boolean('resolved').default(false), // 👈 Útil: Marcar comentarios como resueltos

  createdAt: timestamp('created_at').$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at').$defaultFn(() => new Date())
    .$onUpdate(() => new Date()) // 👈 Añadido: Actualizar automáticamente
})

export const commentRelations = relations(comments, ({ one }) => ({
  note: one(notes, {
    fields: [comments.noteId],
    references: [notes.id]
  }),
  user: one(user, { // 👈 Añadido: Relación con el usuario
    fields: [comments.userId],
    references: [user.id]
  })
}));

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

export const tasks = pgTable("tasks", {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('todo'), // todo, in-progress, done
  priority: text('priority').notNull().default('medium'), // low, medium, high
  dueDate: timestamp('due_date'),
  tag: text('tag'),
  notebookId: text('notebook_id').notNull().references(() => notebooks.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()),
  updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date())
    .$onUpdate(() => /* @__PURE__ */ new Date())
});

export const taskRelations = relations(tasks, ({ one }) => ({
  notebook: one(notebooks, {
    fields: [tasks.notebookId],
    references: [notebooks.id]
  })
}));

export const vaultGroups = pgTable("vault_groups", {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    name: text('name').notNull(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()),
});

export const vaultGroupRelations = relations(vaultGroups, ({ one, many }) => ({
    user: one(user, {
        fields: [vaultGroups.userId],
        references: [user.id]
    }),
    entries: many(vaultEntries)
}));

export const vaultEntries = pgTable("vault_entries", {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    groupId: text('group_id').notNull().references(() => vaultGroups.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    username: text('username').notNull(),
    password: text('password').notNull(), // Encrypted
    website: text('website'),
    notes: text('notes'),
    createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()),
    updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date()).$onUpdate(() => /* @__PURE__ */ new Date()),
});

export const vaultEntryRelations = relations(vaultEntries, ({ one }) => ({
    group: one(vaultGroups, {
        fields: [vaultEntries.groupId],
        references: [vaultGroups.id]
    })
}));

export const vaultMembers = pgTable("vault_members", {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    vaultGroupId: text('vault_group_id').notNull().references(() => vaultGroups.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('pending'), // 'pending', 'active'
    
    // Permissions
    canEdit: boolean('can_edit').default(false).notNull(),
    canCreate: boolean('can_create').default(false).notNull(),
    canDelete: boolean('can_delete').default(false).notNull(),

    invitedBy: text('invited_by').notNull().references(() => user.id),
    createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()),
});

export const vaultMemberRelations = relations(vaultMembers, ({ one }) => ({
    group: one(vaultGroups, {
        fields: [vaultMembers.vaultGroupId],
        references: [vaultGroups.id]
    }),
    user: one(user, {
        fields: [vaultMembers.userId],
        references: [user.id]
    }),
    inviter: one(user, {
        fields: [vaultMembers.invitedBy],
        references: [user.id]
    })
}));

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  notebooks: many(notebooks),
  settings: one(settings),
  comments: many(comments),
  vaultGroups: many(vaultGroups),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const schema = { user, session, account, verification, notebooks, notes, tasks, notebookRelations, noteRelations, taskRelations, settings, settingsRelations, comments, commentRelations, userRelations, sessionRelations, accountRelations, apiKeys, apiKeyRelations, vaultGroups, vaultGroupRelations, vaultEntries, vaultEntryRelations, vaultMembers, vaultMemberRelations };