import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const institutions = sqliteTable('institutions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  group: text('group').notNull(),
  officialDomain: text('official_domain'),
  parentId: text('parent_id'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (t) => [index('idx_institutions_group').on(t.group)]);

export const sources = sqliteTable('sources', {
  id: text('id').primaryKey(),
  institutionId: text('institution_id').references(() => institutions.id),
  name: text('name').notNull(),
  url: text('url').notNull(),
  method: text('method').notNull(),
  cadenceMinutes: integer('cadence_minutes').notNull(),
  status: text('status').notNull().default('ready'),
  lastSuccessAt: integer('last_success_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (t) => [uniqueIndex('idx_sources_url').on(t.url), index('idx_sources_status').on(t.status)]);

export const notices = sqliteTable('notices', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull().references(() => sources.id),
  externalId: text('external_id').notNull(),
  institution: text('institution').notNull(),
  group: text('group').notNull(),
  title: text('title').notNull(),
  summary: text('summary'),
  category: text('category').notNull(),
  audience: text('audience').notNull(),
  region: text('region'),
  sourceName: text('source_name').notNull(),
  sourceUrl: text('source_url').notNull(),
  applicationUrl: text('application_url'),
  opensAt: integer('opens_at', { mode: 'timestamp_ms' }),
  closesAt: integer('closes_at', { mode: 'timestamp_ms' }),
  deadlineLabel: text('deadline_label').notNull(),
  status: text('status').notNull().default('open'),
  contentHash: text('content_hash').notNull(),
  verifiedAt: integer('verified_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, (t) => [
  uniqueIndex('idx_notices_source_external').on(t.sourceId, t.externalId),
  index('idx_notices_status_closes').on(t.status, t.closesAt),
  index('idx_notices_group_category').on(t.group, t.category),
]);

export const revisions = sqliteTable('revisions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  noticeId: text('notice_id').notNull().references(() => notices.id),
  contentHash: text('content_hash').notNull(),
  changedFields: text('changed_fields').notNull(),
  discoveredAt: integer('discovered_at', { mode: 'timestamp_ms' }).notNull(),
}, (t) => [index('idx_revisions_notice_discovered').on(t.noticeId, t.discoveredAt)]);

export const bookmarks = sqliteTable('bookmarks', {
  deviceKey: text('device_key').notNull(),
  noticeId: text('notice_id').notNull().references(() => notices.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (t) => [primaryKey({ columns: [t.deviceKey, t.noticeId] }), index('idx_bookmarks_device').on(t.deviceKey)]);

export const sourceChecks = sqliteTable('source_checks', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull().references(() => sources.id),
  outcome: text('outcome').notNull(),
  statusCode: integer('status_code'),
  contentHash: text('content_hash'),
  contentBytes: integer('content_bytes'),
  keywordHits: integer('keyword_hits'),
  pageTitle: text('page_title'),
  message: text('message'),
  startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
  finishedAt: integer('finished_at', { mode: 'timestamp_ms' }).notNull(),
}, (t) => [
  index('idx_source_checks_source_finished').on(t.sourceId, t.finishedAt),
  index('idx_source_checks_outcome_finished').on(t.outcome, t.finishedAt),
]);
