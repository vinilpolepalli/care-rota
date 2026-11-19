import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const caregivers = sqliteTable('caregivers', {
  ownerId: text('owner_id').notNull(),
  id: text('id').notNull(),
  name: text('name').notNull(),
  initials: text('initials').notNull(),
}, (t) => [primaryKey({ columns: [t.ownerId, t.id] })]);

export const visits = sqliteTable('visits', {
  ownerId: text('owner_id').notNull(),
  id: text('id').notNull(),
  client: text('client').notNull(),
  area: text('area').notNull(),
  caregiverId: text('caregiver_id'),
  start: integer('start_min').notNull(),
  end: integer('end_min').notNull(),
  status: text('status').notNull(),
  tasks: text('tasks').notNull(), // JSON
  notes: text('notes').notNull(), // JSON
}, (t) => [primaryKey({ columns: [t.ownerId, t.id] })]);

export const settings = sqliteTable('settings', {
  ownerId: text('owner_id').primaryKey(),
  lateWindowMin: integer('late_window_min').notNull(),
  gapThresholdMin: integer('gap_threshold_min').notNull(),
});

/** Append-only: rows are only ever inserted (or wiped wholesale by reset). */
export const visitEvents = sqliteTable('visit_events', {
  seq: integer('seq').primaryKey({ autoIncrement: true }),
  ownerId: text('owner_id').notNull(),
  visitId: text('visit_id').notNull(),
  source: text('source').notNull(),
  at: text('at').notNull(),
  action: text('action').notNull(),
  detail: text('detail').notNull(),
}, (t) => [index('events_owner').on(t.ownerId)]);

export const writeCounts = sqliteTable('write_counts', {
  ownerId: text('owner_id').notNull(),
  bucket: integer('bucket').notNull(),
  count: integer('count').notNull(),
}, (t) => [primaryKey({ columns: [t.ownerId, t.bucket] })]);
