/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Neon PostgreSQL Database Engine for Misha Greetings
 */

import { Pool, PoolConfig } from 'pg';
import fs from 'fs';
import path from 'path';
import { deleteCloudMedia } from './storage';

export interface GreetingRecord {
  id: string;
  short_id: string;
  owner_id?: string;
  title: string;
  project_json: any;
  status: 'published' | 'draft' | 'archived';
  visibility: 'public' | 'unlisted' | 'private';
  password_hash?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  view_count: number;
  chatKey?: string;
  creatorName?: string;
  creatorEmail?: string;
}

export interface ServerUser {
  id: string;
  email: string;
  name: string;
  password?: string;
  avatar?: string;
  role: 'admin' | 'creator' | 'user' | 'guest';
  provider: 'google' | 'email' | 'guest';
  createdAt: string;
  lastLoginAt?: string;
}

export interface ServerReaction {
  id: string;
  greeting_id: string;
  reaction: string;
  custom_note?: string;
  created_at: string;
}

export interface ServerChatMessage {
  id: string;
  greeting_id: string;
  sender: 'creator' | 'receiver';
  sender_name?: string;
  device_id?: string;
  text?: string;
  media_url?: string;
  reaction?: string;
  is_voice_note?: boolean;
  duration?: string;
  created_at: string;
  status?: string;
}

export interface ChatRoomMeta {
  greeting_id: string;
  chat_key?: string;
  created_at: string;
  last_message_at?: string;
  last_exit_at?: string;
  last_active_at?: string;
  active_participants?: number;
}

// Retention Constants
export const CARD_RETENTION_DAYS = 30;
export const CARD_RETENTION_MS = CARD_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export const CHAT_RETENTION_HOURS = 12;
export const CHAT_RETENTION_MS = CHAT_RETENTION_HOURS * 60 * 60 * 1000;

// Local persistent backup file when DATABASE_URL is not set or during offline fallback
const LOCAL_BACKUP_FILE = path.join(process.cwd(), '.misha_data_store.json');

// In-Memory caches synced with Neon / Disk
const localGreetings = new Map<string, GreetingRecord>();
const localShortIds = new Map<string, string>();
const localUsers = new Map<string, ServerUser>();
const localTokens = new Map<string, ServerUser>();
const localReactions = new Map<string, any[]>();
const localChats = new Map<string, { chatKey: string; messages: any[]; createdAt: string; lastMessageAt?: string; lastExitAt?: string; lastActiveAt?: string }>();
const localChatRooms = new Map<string, ChatRoomMeta>();

let pool: Pool | null = null;
let isNeonConnected = false;

// Initialize Neon PostgreSQL Pool
export function getDbPool(): Pool | null {
  if (pool) return pool;

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;
  if (!dbUrl || !dbUrl.trim()) {
    console.log('[Neon PostgreSQL] No DATABASE_URL provided. Operating in local persistent store mode with disk backup.');
    return null;
  }

  try {
    const config: PoolConfig = {
      connectionString: dbUrl.trim(),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: {
        rejectUnauthorized: false,
      },
    };

    pool = new Pool(config);

    pool.on('error', (err) => {
      console.error('[Neon PostgreSQL] Unexpected pool error:', err.message);
    });

    return pool;
  } catch (err) {
    console.error('[Neon PostgreSQL] Failed to initialize pool:', err);
    return null;
  }
}

// Load local fallback store from disk
export function loadLocalStoreFromDisk() {
  try {
    if (fs.existsSync(LOCAL_BACKUP_FILE)) {
      const raw = fs.readFileSync(LOCAL_BACKUP_FILE, 'utf8');
      const backup = JSON.parse(raw);
      if (Array.isArray(backup.greetings)) {
        for (const [k, v] of backup.greetings) {
          localGreetings.set(k, v);
          if (v && v.short_id) {
            localShortIds.set(v.short_id, k);
          }
        }
      }
      if (Array.isArray(backup.shortIds)) {
        for (const [k, v] of backup.shortIds) {
          localShortIds.set(k, v);
        }
      }
      if (Array.isArray(backup.users)) {
        for (const [k, v] of backup.users) localUsers.set(k, v);
      }
      if (Array.isArray(backup.tokens)) {
        for (const [k, v] of backup.tokens) localTokens.set(k, v);
      }
      if (Array.isArray(backup.reactions)) {
        for (const [k, v] of backup.reactions) localReactions.set(k, v);
      }
      if (Array.isArray(backup.chats)) {
        for (const [k, v] of backup.chats) localChats.set(k, v);
      }
      console.log(`[Database] Loaded ${localGreetings.size} greetings from local persistent storage.`);
    }
  } catch (e) {
    console.warn('[Database] Could not load local store from disk:', e);
  }
}

// Save local fallback store to disk
export function saveLocalStoreToDisk() {
  try {
    const backup = {
      greetings: Array.from(localGreetings.entries()),
      shortIds: Array.from(localShortIds.entries()),
      users: Array.from(localUsers.entries()),
      tokens: Array.from(localTokens.entries()),
      reactions: Array.from(localReactions.entries()),
      chats: Array.from(localChats.entries()),
    };
    fs.writeFileSync(LOCAL_BACKUP_FILE, JSON.stringify(backup), 'utf8');
  } catch (e) {
    console.warn('[Database] Could not save store to disk:', e);
  }
}

// Initialize tables in Neon PostgreSQL
export async function initDatabase(): Promise<boolean> {
  loadLocalStoreFromDisk();

  const db = getDbPool();
  if (!db) {
    return false;
  }

  try {
    const client = await db.connect();
    try {
      // 1. Users Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          password_hash TEXT,
          avatar TEXT,
          role TEXT DEFAULT 'creator',
          provider TEXT DEFAULT 'email',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          last_login_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 2. Greetings Table (Mandatory Neon Schema)
      await client.query(`
        CREATE TABLE IF NOT EXISTS greetings (
          id TEXT PRIMARY KEY,
          short_id TEXT UNIQUE NOT NULL,
          owner_id TEXT,
          title TEXT NOT NULL DEFAULT 'A Special Greeting',
          project_json JSONB NOT NULL,
          status TEXT NOT NULL DEFAULT 'published',
          visibility TEXT NOT NULL DEFAULT 'public',
          password_hash TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          expires_at TIMESTAMPTZ,
          view_count INTEGER NOT NULL DEFAULT 0,
          chat_key TEXT,
          creator_name TEXT,
          creator_email TEXT
        );
      `);

      // Indexes for rapid lookups
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_greetings_short_id ON greetings(short_id);
        CREATE INDEX IF NOT EXISTS idx_greetings_owner_id ON greetings(owner_id);
        CREATE INDEX IF NOT EXISTS idx_greetings_created_at ON greetings(created_at DESC);
      `);

      // 3. Reactions Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS reactions (
          id TEXT PRIMARY KEY,
          greeting_id TEXT NOT NULL,
          reaction TEXT NOT NULL,
          custom_note TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_reactions_greeting_id ON reactions(greeting_id);
      `);

      // 4. Secret Chat Messages Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          greeting_id TEXT NOT NULL,
          sender TEXT NOT NULL,
          sender_name TEXT,
          device_id TEXT,
          text TEXT,
          media_url TEXT,
          reaction TEXT,
          is_voice_note BOOLEAN DEFAULT FALSE,
          duration TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          status TEXT DEFAULT 'delivered'
        );
        CREATE INDEX IF NOT EXISTS idx_chat_messages_greeting_id ON chat_messages(greeting_id);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
      `);

      // 5. Chat Rooms Metadata & 12-Hour Retention Tracking Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS chat_rooms (
          greeting_id TEXT PRIMARY KEY,
          chat_key TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          last_message_at TIMESTAMPTZ DEFAULT NOW(),
          last_exit_at TIMESTAMPTZ,
          last_active_at TIMESTAMPTZ DEFAULT NOW(),
          active_participants INTEGER DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_exit_at ON chat_rooms(last_exit_at);
        CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_message_at ON chat_rooms(last_message_at);
      `);

      isNeonConnected = true;
      console.log('✅ [Neon PostgreSQL] Connected and all tables (including 30-day card & 12-hour chat retention) verified successfully.');

      // Auto-migrate local records to Neon
      if (localGreetings.size > 0) {
        console.log(`[Neon PostgreSQL] Syncing ${localGreetings.size} local greeting records to Neon...`);
        for (const greeting of localGreetings.values()) {
          try {
            await client.query(
              `INSERT INTO greetings (
                id, short_id, owner_id, title, project_json, status, visibility,
                created_at, updated_at, expires_at, view_count, chat_key, creator_name, creator_email
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
              ON CONFLICT (id) DO UPDATE SET
                short_id = EXCLUDED.short_id,
                title = EXCLUDED.title,
                project_json = EXCLUDED.project_json,
                updated_at = EXCLUDED.updated_at,
                view_count = EXCLUDED.view_count`,
              [
                greeting.id,
                greeting.short_id,
                greeting.owner_id || null,
                greeting.title || 'A Special Greeting',
                JSON.stringify(greeting.project_json),
                greeting.status || 'published',
                greeting.visibility || 'public',
                greeting.created_at || new Date().toISOString(),
                greeting.updated_at || new Date().toISOString(),
                greeting.expires_at || null,
                greeting.view_count || 0,
                greeting.chatKey || null,
                greeting.creatorName || null,
                greeting.creatorEmail || null,
              ]
            );
          } catch (syncErr) {
            console.warn('[Neon PostgreSQL] Record sync warning:', syncErr);
          }
        }
      }

      return true;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('❌ [Neon PostgreSQL] Connection failed, falling back to local persistent disk store:', err.message);
    isNeonConnected = false;
    return false;
  }
}

export function isDatabaseConnected(): boolean {
  return isNeonConnected;
}

// ----------------------------------------------------
// GREETINGS CRUD (30-Day Auto Retention Policy)
// ----------------------------------------------------

export function extractMediaUrlsFromObj(obj: any): string[] {
  const urls: string[] = [];
  function recurse(current: any) {
    if (!current) return;
    if (typeof current === 'string') {
      if (
        current.startsWith('/uploads/') ||
        (current.includes('cloudinary.com') && (current.includes('/upload/') || current.includes('/image/') || current.includes('/video/')))
      ) {
        urls.push(current);
      }
      return;
    }
    if (Array.isArray(current)) {
      for (const item of current) {
        recurse(item);
      }
      return;
    }
    if (typeof current === 'object') {
      for (const key of Object.keys(current)) {
        recurse(current[key]);
      }
    }
  }
  recurse(obj);
  return Array.from(new Set(urls));
}

export function isGreetingExpired(greeting: { created_at?: string; expires_at?: string; createdAt?: string; expiresAt?: string } | null | undefined): boolean {
  if (!greeting) return false;
  const now = Date.now();
  const expiresAt = greeting.expires_at || (greeting as any).expiresAt;
  if (expiresAt) {
    const expTime = new Date(expiresAt).getTime();
    if (!isNaN(expTime)) {
      return expTime <= now;
    }
  }
  const createdAt = greeting.created_at || (greeting as any).createdAt;
  if (createdAt) {
    const createdTime = new Date(createdAt).getTime();
    if (!isNaN(createdTime)) {
      return (now - createdTime) >= CARD_RETENTION_MS;
    }
  }
  return false;
}

export async function saveGreeting(record: GreetingRecord): Promise<GreetingRecord> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  
  // If created_at is missing, invalid, or already expired in the past, reset to now
  let validCreatedTime = record.created_at ? new Date(record.created_at).getTime() : now;
  if (isNaN(validCreatedTime) || (now - validCreatedTime) >= CARD_RETENTION_MS) {
    validCreatedTime = now;
    record.created_at = nowIso;
  } else {
    record.created_at = new Date(validCreatedTime).toISOString();
  }
  record.updated_at = nowIso;
  
  // Enforce exactly 30-day expiration retention from valid creation time
  record.expires_at = new Date(validCreatedTime + CARD_RETENTION_MS).toISOString();

  // Ensure project_json has retention metadata
  if (record.project_json && typeof record.project_json === 'object') {
    record.project_json.retentionExpiresAt = record.expires_at;
    record.project_json.expiresAt = record.expires_at;
    record.project_json.retentionDays = CARD_RETENTION_DAYS;
  }

  // Always update local cache & disk (including case-insensitive shortId)
  localGreetings.set(record.id, record);
  if (record.short_id) {
    localShortIds.set(record.short_id, record.id);
    localShortIds.set(record.short_id.toLowerCase(), record.id);
  }
  saveLocalStoreToDisk();

  const db = getDbPool();
  if (db && isNeonConnected) {
    try {
      await db.query(
        `INSERT INTO greetings (
          id, short_id, owner_id, title, project_json, status, visibility,
          password_hash, created_at, updated_at, expires_at, view_count,
          chat_key, creator_name, creator_email
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          short_id = EXCLUDED.short_id,
          owner_id = EXCLUDED.owner_id,
          title = EXCLUDED.title,
          project_json = EXCLUDED.project_json,
          status = EXCLUDED.status,
          visibility = EXCLUDED.visibility,
          updated_at = EXCLUDED.updated_at,
          expires_at = EXCLUDED.expires_at,
          view_count = EXCLUDED.view_count,
          chat_key = EXCLUDED.chat_key,
          creator_name = EXCLUDED.creator_name,
          creator_email = EXCLUDED.creator_email`,
        [
          record.id,
          record.short_id,
          record.owner_id || null,
          record.title || 'A Special Greeting',
          JSON.stringify(record.project_json),
          record.status || 'published',
          record.visibility || 'public',
          record.password_hash || null,
          record.created_at,
          record.updated_at,
          record.expires_at,
          record.view_count || 0,
          record.chatKey || null,
          record.creatorName || null,
          record.creatorEmail || null,
        ]
      );
    } catch (err) {
      console.error('[Neon PostgreSQL] Failed to save greeting in Neon:', err);
    }
  }

  return record;
}

// Raw getter without auto-deletion (for internal operations and expiration verification)
export async function getRawGreetingById(idOrShortId: string): Promise<GreetingRecord | null> {
  const clean = (idOrShortId || '').trim();
  if (!clean) return null;

  const db = getDbPool();
  if (db && isNeonConnected) {
    try {
      const res = await db.query(
        `SELECT id, short_id, owner_id, title, project_json, status, visibility,
                password_hash, created_at, updated_at, expires_at, view_count,
                chat_key, creator_name, creator_email
         FROM greetings 
         WHERE id = $1 
            OR short_id = $1 
            OR LOWER(short_id) = LOWER($1) 
            OR LOWER(id) = LOWER($1) 
         LIMIT 1`,
        [clean]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          short_id: row.short_id,
          owner_id: row.owner_id,
          title: row.title,
          project_json: typeof row.project_json === 'string' ? JSON.parse(row.project_json) : row.project_json,
          status: row.status,
          visibility: row.visibility,
          password_hash: row.password_hash,
          created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
          updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
          expires_at: row.expires_at ? new Date(row.expires_at).toISOString() : undefined,
          view_count: row.view_count || 0,
          chatKey: row.chat_key,
          creatorName: row.creator_name,
          creatorEmail: row.creator_email,
        };
      }
    } catch (err) {
      console.error('[Neon PostgreSQL] Error in getRawGreetingById:', err);
    }
  }

  if (localShortIds.has(clean)) {
    const cardId = localShortIds.get(clean)!;
    const g = localGreetings.get(cardId);
    if (g) return g;
  }
  if (localShortIds.has(clean.toLowerCase())) {
    const cardId = localShortIds.get(clean.toLowerCase())!;
    const g = localGreetings.get(cardId);
    if (g) return g;
  }
  if (localGreetings.has(clean)) {
    return localGreetings.get(clean)!;
  }
  for (const greeting of localGreetings.values()) {
    if (
      greeting.short_id === clean ||
      greeting.id === clean ||
      greeting.short_id?.toLowerCase() === clean.toLowerCase() ||
      greeting.id?.toLowerCase() === clean.toLowerCase()
    ) {
      return greeting;
    }
  }
  return null;
}

export async function getGreetingByShortId(shortId: string): Promise<GreetingRecord | null> {
  const clean = (shortId || '').trim();
  if (!clean) return null;

  const raw = await getRawGreetingById(clean);
  if (!raw) return null;

  // Auto-delete if expired past 30 days
  if (isGreetingExpired(raw)) {
    console.log(`⏳ Greeting "${raw.title || raw.id}" has expired (30-day retention). Purging...`);
    await deleteGreeting(raw.id);
    return null;
  }

  // Update local cache
  localGreetings.set(raw.id, raw);
  if (raw.short_id) localShortIds.set(raw.short_id, raw.id);
  return raw;
}

export async function getGreetingById(id: string): Promise<GreetingRecord | null> {
  const clean = (id || '').trim();
  if (!clean) return null;

  const raw = await getRawGreetingById(clean);
  if (!raw) return null;

  // Auto-delete if expired past 30 days
  if (isGreetingExpired(raw)) {
    console.log(`⏳ Greeting "${raw.title || raw.id}" has expired (30-day retention). Purging...`);
    await deleteGreeting(raw.id);
    return null;
  }

  localGreetings.set(raw.id, raw);
  if (raw.short_id) localShortIds.set(raw.short_id, raw.id);
  return raw;
}

export async function incrementGreetingViewCount(idOrShortId: string): Promise<number> {
  const greeting = await getGreetingById(idOrShortId);
  if (!greeting) return 0;

  const newCount = (greeting.view_count || 0) + 1;
  greeting.view_count = newCount;
  localGreetings.set(greeting.id, greeting);
  saveLocalStoreToDisk();

  const db = getDbPool();
  if (db && isNeonConnected) {
    try {
      await db.query(`UPDATE greetings SET view_count = view_count + 1 WHERE id = $1`, [greeting.id]);
    } catch (err) {
      console.error('[Neon PostgreSQL] Error incrementing view count:', err);
    }
  }

  return newCount;
}

export async function listAllGreetings(): Promise<GreetingRecord[]> {
  let all: GreetingRecord[] = [];
  const db = getDbPool();
  if (db && isNeonConnected) {
    try {
      const res = await db.query(
        `SELECT id, short_id, owner_id, title, project_json, status, visibility,
                password_hash, created_at, updated_at, expires_at, view_count,
                chat_key, creator_name, creator_email
         FROM greetings ORDER BY created_at DESC`
      );
      all = res.rows.map((row) => ({
        id: row.id,
        short_id: row.short_id,
        owner_id: row.owner_id,
        title: row.title,
        project_json: typeof row.project_json === 'string' ? JSON.parse(row.project_json) : row.project_json,
        status: row.status,
        visibility: row.visibility,
        password_hash: row.password_hash,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
        expires_at: row.expires_at ? new Date(row.expires_at).toISOString() : undefined,
        view_count: row.view_count || 0,
        chatKey: row.chat_key,
        creatorName: row.creator_name,
        creatorEmail: row.creator_email,
      }));
    } catch (err) {
      console.error('[Neon PostgreSQL] Error listing all greetings:', err);
      all = Array.from(localGreetings.values());
    }
  } else {
    all = Array.from(localGreetings.values());
  }

  // Filter out expired items and trigger background purge
  const valid: GreetingRecord[] = [];
  for (const g of all) {
    if (isGreetingExpired(g)) {
      deleteGreeting(g.id).catch(() => {});
    } else {
      valid.push(g);
    }
  }

  return valid.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function deleteGreeting(idOrShortId: string): Promise<boolean> {
  const greeting = await getRawGreetingById(idOrShortId);
  if (!greeting) return false;

  // Clean up all associated cloud and disk media
  try {
    const mediaUrls = extractMediaUrlsFromObj(greeting.project_json);
    const chatData = localChats.get(greeting.id);
    const messages = Array.isArray(chatData) ? chatData : (chatData?.messages || []);
    for (const msg of messages) {
      if (msg.audioUrl) mediaUrls.push(msg.audioUrl);
      if (msg.imageUrl) mediaUrls.push(msg.imageUrl);
      if (msg.media_url) mediaUrls.push(msg.media_url);
    }
    // Asynchronously delete media assets from Cloudinary / disk
    Promise.allSettled(mediaUrls.map((url) => deleteCloudMedia(url))).catch((err) => {
      console.warn('[Storage] Error during greeting media cleanup:', err);
    });
  } catch (err) {
    console.warn('[Storage] Media cleanup parsing error:', err);
  }

  localGreetings.delete(greeting.id);
  if (greeting.short_id) localShortIds.delete(greeting.short_id);
  localReactions.delete(greeting.id);
  localChats.delete(greeting.id);
  saveLocalStoreToDisk();

  const db = getDbPool();
  if (db && isNeonConnected) {
    try {
      await db.query(`DELETE FROM chat_messages WHERE greeting_id = $1`, [greeting.id]);
      await db.query(`DELETE FROM reactions WHERE greeting_id = $1`, [greeting.id]);
      await db.query(`DELETE FROM greetings WHERE id = $1`, [greeting.id]);
    } catch (err) {
      console.error('[Neon PostgreSQL] Error deleting greeting:', err);
    }
  }

  return true;
}

// Background cleanup worker for expired greetings (> 30 days old)
export async function cleanupExpiredGreetings(): Promise<number> {
  let cleanedCount = 0;

  // 1. Check local cache
  for (const greeting of Array.from(localGreetings.values())) {
    if (isGreetingExpired(greeting)) {
      await deleteGreeting(greeting.id);
      cleanedCount++;
    }
  }

  // 2. Query Neon PostgreSQL for expired cards
  const db = getDbPool();
  if (db && isNeonConnected) {
    try {
      const res = await db.query(
        `SELECT id FROM greetings WHERE (expires_at IS NOT NULL AND expires_at <= NOW()) OR (created_at <= NOW() - INTERVAL '30 days')`
      );
      for (const row of res.rows) {
        await deleteGreeting(row.id);
        cleanedCount++;
      }
    } catch (err) {
      console.error('[Neon PostgreSQL] Error during expired greetings cleanup:', err);
    }
  }

  if (cleanedCount > 0) {
    console.log(`🧹 [Retention Policy] Purged ${cleanedCount} expired greeting cards (> 30 days old) and their media.`);
  }

  return cleanedCount;
}

// ----------------------------------------------------
// USERS & AUTH CRUD
// ----------------------------------------------------

export async function saveUser(user: ServerUser): Promise<ServerUser> {
  localUsers.set(user.email.toLowerCase(), user);
  saveLocalStoreToDisk();

  const db = getDbPool();
  if (db && isNeonConnected) {
    try {
      await db.query(
        `INSERT INTO users (id, email, name, password_hash, avatar, role, provider, created_at, last_login_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name,
           password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
           avatar = EXCLUDED.avatar,
           role = EXCLUDED.role,
           last_login_at = EXCLUDED.last_login_at`,
        [
          user.id,
          user.email.toLowerCase(),
          user.name,
          user.password || null,
          user.avatar || null,
          user.role || 'creator',
          user.provider || 'email',
          user.createdAt || new Date().toISOString(),
          user.lastLoginAt || new Date().toISOString(),
        ]
      );
    } catch (err) {
      console.error('[Neon PostgreSQL] Error saving user:', err);
    }
  }

  return user;
}

export async function getUserByEmail(email: string): Promise<ServerUser | null> {
  const normalized = (email || '').trim().toLowerCase();
  if (!normalized) return null;

  const db = getDbPool();
  if (db && isNeonConnected) {
    try {
      const res = await db.query(
        `SELECT id, email, name, password_hash, avatar, role, provider, created_at, last_login_at
         FROM users WHERE email = $1 LIMIT 1`,
        [normalized]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        const user: ServerUser = {
          id: row.id,
          email: row.email,
          name: row.name,
          password: row.password_hash,
          avatar: row.avatar,
          role: row.role,
          provider: row.provider,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
          lastLoginAt: row.last_login_at ? new Date(row.last_login_at).toISOString() : undefined,
        };
        localUsers.set(user.email.toLowerCase(), user);
        return user;
      }
    } catch (err) {
      console.error('[Neon PostgreSQL] Error querying user by email:', err);
    }
  }

  return localUsers.get(normalized) || null;
}

export async function getUserById(id: string): Promise<ServerUser | null> {
  if (!id) return null;

  const db = getDbPool();
  if (db && isNeonConnected) {
    try {
      const res = await db.query(
        `SELECT id, email, name, password_hash, avatar, role, provider, created_at, last_login_at
         FROM users WHERE id = $1 LIMIT 1`,
        [id]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          email: row.email,
          name: row.name,
          password: row.password_hash,
          avatar: row.avatar,
          role: row.role,
          provider: row.provider,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
          lastLoginAt: row.last_login_at ? new Date(row.last_login_at).toISOString() : undefined,
        };
      }
    } catch (err) {
      console.error('[Neon PostgreSQL] Error querying user by id:', err);
    }
  }

  for (const user of localUsers.values()) {
    if (user.id === id) return user;
  }
  return null;
}

export async function listAllUsers(): Promise<ServerUser[]> {
  const db = getDbPool();
  if (db && isNeonConnected) {
    try {
      const res = await db.query(
        `SELECT id, email, name, password_hash, avatar, role, provider, created_at, last_login_at
         FROM users ORDER BY created_at DESC`
      );
      return res.rows.map((row) => ({
        id: row.id,
        email: row.email,
        name: row.name,
        password: row.password_hash,
        avatar: row.avatar,
        role: row.role,
        provider: row.provider,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        lastLoginAt: row.last_login_at ? new Date(row.last_login_at).toISOString() : undefined,
      }));
    } catch (err) {
      console.error('[Neon PostgreSQL] Error listing all users:', err);
    }
  }

  return Array.from(localUsers.values());
}

export function saveUserToken(token: string, user: ServerUser) {
  localTokens.set(token, user);
}

export function getUserByToken(token: string): ServerUser | null {
  return localTokens.get(token) || null;
}

export function deleteUserToken(token: string) {
  localTokens.delete(token);
}

// ----------------------------------------------------
// REACTIONS CRUD
// ----------------------------------------------------

export async function saveReaction(greetingId: string, reaction: string, customNote?: string): Promise<any> {
  const item = {
    id: `react-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    greeting_id: greetingId,
    reaction,
    custom_note: customNote,
    created_at: new Date().toISOString(),
  };

  const list = localReactions.get(greetingId) || [];
  list.push(item);
  localReactions.set(greetingId, list);
  saveLocalStoreToDisk();

  const db = getDbPool();
  if (db && isNeonConnected) {
    try {
      await db.query(
        `INSERT INTO reactions (id, greeting_id, reaction, custom_note, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [item.id, greetingId, reaction, customNote || null, item.created_at]
      );
    } catch (err) {
      console.error('[Neon PostgreSQL] Error saving reaction:', err);
    }
  }

  return item;
}

export async function getReactions(greetingId: string): Promise<any[]> {
  const db = getDbPool();
  if (db && isNeonConnected) {
    try {
      const res = await db.query(
        `SELECT id, greeting_id, reaction, custom_note, created_at
         FROM reactions WHERE greeting_id = $1 ORDER BY created_at ASC`,
        [greetingId]
      );
      return res.rows;
    } catch (err) {
      console.error('[Neon PostgreSQL] Error fetching reactions:', err);
    }
  }

  return localReactions.get(greetingId) || [];
}

// ----------------------------------------------------
// SECRET CHAT CRUD & 12-HOUR AUTO-PURGE RETENTION
// ----------------------------------------------------

export async function recordChatJoin(greetingId: string, deviceId?: string): Promise<void> {
  const now = new Date().toISOString();
  const room = localChatRooms.get(greetingId) || {
    greeting_id: greetingId,
    created_at: now,
    last_active_at: now,
    active_participants: 0,
  };
  room.last_active_at = now;
  room.active_participants = Math.max(1, (room.active_participants || 0) + 1);
  localChatRooms.set(greetingId, room);

  const db = getDbPool();
  if (db && isNeonConnected) {
    try {
      await db.query(
        `INSERT INTO chat_rooms (greeting_id, created_at, last_active_at, active_participants)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (greeting_id) DO UPDATE SET
           last_active_at = EXCLUDED.last_active_at,
           active_participants = GREATEST(1, chat_rooms.active_participants + 1)`,
        [greetingId, now, now, room.active_participants]
      );
    } catch (err) {
      console.warn('[Neon PostgreSQL] Error recording chat join:', err);
    }
  }
}

export async function recordChatExit(greetingId: string, deviceId?: string): Promise<void> {
  const now = new Date().toISOString();
  const room = localChatRooms.get(greetingId) || {
    greeting_id: greetingId,
    created_at: now,
    last_exit_at: now,
    last_active_at: now,
    active_participants: 0,
  };
  room.last_exit_at = now;
  room.active_participants = Math.max(0, (room.active_participants || 1) - 1);
  localChatRooms.set(greetingId, room);

  const localChat = localChats.get(greetingId);
  if (localChat) {
    localChat.lastExitAt = now;
  }
  saveLocalStoreToDisk();

  const db = getDbPool();
  if (db && isNeonConnected) {
    try {
      await db.query(
        `INSERT INTO chat_rooms (greeting_id, created_at, last_exit_at, last_active_at, active_participants)
         VALUES ($1, $2, $3, $4, 0)
         ON CONFLICT (greeting_id) DO UPDATE SET
           last_exit_at = EXCLUDED.last_exit_at,
           active_participants = GREATEST(0, chat_rooms.active_participants - 1)`,
        [greetingId, now, now, now]
      );
    } catch (err) {
      console.warn('[Neon PostgreSQL] Error recording chat exit:', err);
    }
  }
  console.log(`🚪 [Chat Retention] Participant exit recorded for room "${greetingId}". 12-hour auto-purge countdown started.`);
}

export async function isChatRoomExpired(greetingId: string): Promise<boolean> {
  const now = Date.now();

  // 1. Check local chat room exit timestamp
  const room = localChatRooms.get(greetingId);
  if (room?.last_exit_at) {
    const exitTime = new Date(room.last_exit_at).getTime();
    if (!isNaN(exitTime) && now - exitTime >= CHAT_RETENTION_MS) {
      return true;
    }
  }

  // 2. Check local chat last exit / message timestamp
  const localChat = localChats.get(greetingId);
  if (localChat) {
    if (localChat.lastExitAt) {
      const exitTime = new Date(localChat.lastExitAt).getTime();
      if (!isNaN(exitTime) && now - exitTime >= CHAT_RETENTION_MS) {
        return true;
      }
    }
    if (localChat.messages && localChat.messages.length > 0) {
      const lastMsg = localChat.messages[localChat.messages.length - 1];
      const msgTime = new Date(lastMsg.timestamp || lastMsg.created_at || localChat.createdAt).getTime();
      if (!isNaN(msgTime) && now - msgTime >= CHAT_RETENTION_MS) {
        return true;
      }
    }
  }

  // 3. Check Neon PostgreSQL
  const db = getDbPool();
  if (db && isNeonConnected) {
    try {
      const roomRes = await db.query(
        `SELECT last_exit_at, last_message_at FROM chat_rooms WHERE greeting_id = $1 LIMIT 1`,
        [greetingId]
      );
      if (roomRes.rows.length > 0) {
        const row = roomRes.rows[0];
        if (row.last_exit_at) {
          const exitTime = new Date(row.last_exit_at).getTime();
          if (!isNaN(exitTime) && now - exitTime >= CHAT_RETENTION_MS) {
            return true;
          }
        }
      }

      // Check oldest / newest message in chat_messages
      const msgRes = await db.query(
        `SELECT MAX(created_at) AS last_msg_at FROM chat_messages WHERE greeting_id = $1`,
        [greetingId]
      );
      if (msgRes.rows.length > 0 && msgRes.rows[0].last_msg_at) {
        const lastMsgTime = new Date(msgRes.rows[0].last_msg_at).getTime();
        if (!isNaN(lastMsgTime) && now - lastMsgTime >= CHAT_RETENTION_MS) {
          return true;
        }
      }
    } catch (err) {
      console.warn('[Neon PostgreSQL] Error checking chat expiry:', err);
    }
  }

  return false;
}

export async function saveChatMessage(greetingId: string, msg: any): Promise<any> {
  const now = new Date().toISOString();
  const chat = localChats.get(greetingId) || { chatKey: '', messages: [], createdAt: now };
  chat.messages.push(msg);
  chat.lastMessageAt = now;
  chat.lastActiveAt = now;
  // If participants are sending messages, reset exit timer for active session
  chat.lastExitAt = undefined;
  localChats.set(greetingId, chat);

  const room = localChatRooms.get(greetingId) || {
    greeting_id: greetingId,
    created_at: now,
    last_message_at: now,
    last_active_at: now,
    active_participants: 1,
  };
  room.last_message_at = now;
  room.last_active_at = now;
  room.last_exit_at = undefined;
  localChatRooms.set(greetingId, room);

  saveLocalStoreToDisk();

  const db = getDbPool();
  if (db && isNeonConnected) {
    try {
      await db.query(
        `INSERT INTO chat_messages (
          id, greeting_id, sender, sender_name, device_id, text,
          media_url, reaction, is_voice_note, duration, created_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          msg.id || `msg-${Date.now()}`,
          greetingId,
          msg.sender || 'creator',
          msg.senderName || null,
          msg.deviceId || null,
          msg.text || null,
          msg.mediaUrl || null,
          msg.reaction || null,
          msg.isVoiceNote || false,
          msg.duration || null,
          msg.timestamp || now,
          msg.status || 'delivered',
        ]
      );

      await db.query(
        `INSERT INTO chat_rooms (greeting_id, created_at, last_message_at, last_active_at, active_participants)
         VALUES ($1, $2, $3, $4, 1)
         ON CONFLICT (greeting_id) DO UPDATE SET
           last_message_at = EXCLUDED.last_message_at,
           last_active_at = EXCLUDED.last_active_at,
           last_exit_at = NULL`,
        [greetingId, now, now, now]
      );
    } catch (err) {
      console.error('[Neon PostgreSQL] Error saving chat message:', err);
    }
  }

  return msg;
}

export async function getChatMessages(greetingId: string): Promise<any[]> {
  // Check if chat has expired (> 12 hours since exit or inactivity)
  const expired = await isChatRoomExpired(greetingId);
  if (expired) {
    console.log(`⏰ [Chat Retention] Chat for greeting "${greetingId}" expired (> 12 hours since exit/inactivity). Auto-purging messages and cloud media.`);
    await clearChatMessages(greetingId, true);
    return [];
  }

  const db = getDbPool();
  if (db && isNeonConnected) {
    try {
      const res = await db.query(
        `SELECT id, greeting_id, sender, sender_name AS "senderName", device_id AS "deviceId",
                text, media_url AS "mediaUrl", reaction, is_voice_note AS "isVoiceNote",
                duration, created_at AS "timestamp", status
         FROM chat_messages WHERE greeting_id = $1 ORDER BY created_at ASC`,
        [greetingId]
      );
      return res.rows;
    } catch (err) {
      console.error('[Neon PostgreSQL] Error fetching chat messages:', err);
    }
  }

  const chat = localChats.get(greetingId);
  return chat ? chat.messages : [];
}

export async function clearChatMessages(greetingId: string, purgeMedia = true): Promise<boolean> {
  // 1. Gather all existing messages to extract Cloudinary/local media URLs
  let messagesToPurge: any[] = [];
  const localChat = localChats.get(greetingId);
  if (localChat?.messages) {
    messagesToPurge = [...localChat.messages];
  }

  const db = getDbPool();
  if (db && isNeonConnected) {
    try {
      const res = await db.query(
        `SELECT media_url FROM chat_messages WHERE greeting_id = $1 AND media_url IS NOT NULL`,
        [greetingId]
      );
      for (const row of res.rows) {
        if (row.media_url) {
          messagesToPurge.push({ media_url: row.media_url });
        }
      }
    } catch (err) {
      console.warn('[Neon PostgreSQL] Error querying chat media for cleanup:', err);
    }
  }

  // 2. Clean up attached cloud and disk media
  if (purgeMedia && messagesToPurge.length > 0) {
    const mediaUrls: string[] = [];
    for (const msg of messagesToPurge) {
      if (msg.mediaUrl) mediaUrls.push(msg.mediaUrl);
      if (msg.media_url) mediaUrls.push(msg.media_url);
      if (msg.imageUrl) mediaUrls.push(msg.imageUrl);
      if (msg.audioUrl) mediaUrls.push(msg.audioUrl);
    }
    if (mediaUrls.length > 0) {
      Promise.allSettled(mediaUrls.map((url) => deleteCloudMedia(url))).catch((err) => {
        console.warn('[Storage] Error during chat media cleanup:', err);
      });
    }
  }

  // 3. Remove from memory and disk
  localChats.delete(greetingId);
  localChatRooms.delete(greetingId);
  saveLocalStoreToDisk();

  // 4. Remove from Neon PostgreSQL
  if (db && isNeonConnected) {
    try {
      await db.query(`DELETE FROM chat_messages WHERE greeting_id = $1`, [greetingId]);
      await db.query(`DELETE FROM chat_rooms WHERE greeting_id = $1`, [greetingId]);
    } catch (err) {
      console.error('[Neon PostgreSQL] Error clearing chat messages from Neon:', err);
    }
  }

  return true;
}

// Background worker: auto-purge chats older than 12 hours or where participant exited > 12 hours ago
export async function cleanupExpiredChats(): Promise<{ purgedRooms: number; purgedMessages: number }> {
  let purgedRooms = 0;
  let purgedMessages = 0;
  const now = Date.now();

  // A. Check local cache
  for (const [greetingId, chat] of Array.from(localChats.entries())) {
    let shouldPurge = false;

    // Check exit timer
    if (chat.lastExitAt) {
      const exitTime = new Date(chat.lastExitAt).getTime();
      if (!isNaN(exitTime) && now - exitTime >= CHAT_RETENTION_MS) {
        shouldPurge = true;
      }
    }

    // Check message age
    if (!shouldPurge && chat.messages && chat.messages.length > 0) {
      const lastMsg = chat.messages[chat.messages.length - 1];
      const msgTime = new Date(lastMsg.timestamp || lastMsg.created_at || chat.createdAt).getTime();
      if (!isNaN(msgTime) && now - msgTime >= CHAT_RETENTION_MS) {
        shouldPurge = true;
      }
    }

    if (shouldPurge) {
      purgedMessages += (chat.messages || []).length;
      await clearChatMessages(greetingId, true);
      purgedRooms++;
    }
  }

  // B. Check Neon PostgreSQL
  const db = getDbPool();
  if (db && isNeonConnected) {
    try {
      // 1. Find rooms where last_exit_at <= NOW() - 12 hours
      const expiredRoomsRes = await db.query(
        `SELECT greeting_id FROM chat_rooms WHERE last_exit_at IS NOT NULL AND last_exit_at <= NOW() - INTERVAL '12 hours'`
      );
      for (const row of expiredRoomsRes.rows) {
        await clearChatMessages(row.greeting_id, true);
        purgedRooms++;
      }

      // 2. Find old chat messages where created_at <= NOW() - 12 hours
      const oldMessagesRes = await db.query(
        `SELECT id, greeting_id, media_url FROM chat_messages WHERE created_at <= NOW() - INTERVAL '12 hours'`
      );
      if (oldMessagesRes.rows.length > 0) {
        const mediaUrlsToDelete = oldMessagesRes.rows
          .map((r) => r.media_url)
          .filter((url) => Boolean(url));
        if (mediaUrlsToDelete.length > 0) {
          Promise.allSettled(mediaUrlsToDelete.map((url) => deleteCloudMedia(url))).catch(() => {});
        }

        const idsToDelete = oldMessagesRes.rows.map((r) => r.id);
        await db.query(`DELETE FROM chat_messages WHERE id = ANY($1::text[])`, [idsToDelete]);
        purgedMessages += idsToDelete.length;
      }
    } catch (err) {
      console.error('[Neon PostgreSQL] Error during expired chats background cleanup:', err);
    }
  }

  if (purgedRooms > 0 || purgedMessages > 0) {
    console.log(`🧹 [Chat Retention Worker] Purged ${purgedRooms} chat rooms and ${purgedMessages} chat messages older than 12 hours, and cleaned up associated Cloudinary media.`);
  }

  return { purgedRooms, purgedMessages };
}

// Master Background Worker: runs both 30-day card retention and 12-hour chat auto-deletion
export async function runRetentionPolicyWorker(): Promise<{ expiredCards: number; expiredChats: number; expiredChatMessages: number }> {
  let expiredCards = 0;
  let expiredChats = 0;
  let expiredChatMessages = 0;

  try {
    expiredCards = await cleanupExpiredGreetings();
  } catch (err) {
    console.error('[Retention Worker] Error in 30-day greeting cleanup:', err);
  }

  try {
    const chatStats = await cleanupExpiredChats();
    expiredChats = chatStats.purgedRooms;
    expiredChatMessages = chatStats.purgedMessages;
  } catch (err) {
    console.error('[Retention Worker] Error in 12-hour chat cleanup:', err);
  }

  return {
    expiredCards,
    expiredChats,
    expiredChatMessages,
  };
}
