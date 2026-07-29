import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DATA_DIR = join(ROOT, "data");
const DEFAULT_DB_PATH = join(DATA_DIR, "app.sqlite");

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  twitch_id TEXT UNIQUE NOT NULL,
  twitch_login TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('streamelements', 'streamlabs')),
  channel_id TEXT,
  channel_name TEXT,
  token_ciphertext TEXT NOT NULL,
  token_iv TEXT NOT NULL,
  token_auth_tag TEXT NOT NULL,
  token_type TEXT,
  topics TEXT,
  connected_at INTEGER NOT NULL,
  last_verified_at INTEGER,
  UNIQUE (user_id, provider)
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  nickname TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
`;

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Ouvre (ou cree) une base SQLite au chemin donne et retourne le magasin de donnees pret a l'emploi. */
export function createDb(path) {
  const db = new Database(path);
  if (path !== ":memory:") db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  migrate(db);
  return buildStore(db);
}

/** Ajoute les colonnes introduites apres la creation initiale des tables (CREATE TABLE IF NOT EXISTS ne les rattrape pas). */
function migrate(db) {
  const contactColumns = db.prepare("PRAGMA table_info(contact_messages)").all().map((col) => col.name);
  if (!contactColumns.includes("nickname")) {
    db.exec("ALTER TABLE contact_messages ADD COLUMN nickname TEXT NOT NULL DEFAULT ''");
  }
}

function buildStore(db) {
  const stmts = {
    getUserByTwitchId: db.prepare("SELECT * FROM users WHERE twitch_id = ?"),
    insertUser: db.prepare(`
      INSERT INTO users (id, twitch_id, twitch_login, display_name, avatar_url, created_at, last_login_at)
      VALUES (@id, @twitchId, @twitchLogin, @displayName, @avatarUrl, @now, @now)
    `),
    updateUserProfile: db.prepare(`
      UPDATE users SET twitch_login = @twitchLogin, display_name = @displayName, avatar_url = @avatarUrl, last_login_at = @now
      WHERE id = @id
    `),
    getUserById: db.prepare("SELECT * FROM users WHERE id = ?"),
    insertSession: db.prepare(`
      INSERT INTO sessions (id, user_id, created_at, expires_at)
      VALUES (@id, @userId, @now, @expiresAt)
    `),
    getSessionWithUser: db.prepare(`
      SELECT sessions.id AS session_id, sessions.expires_at AS session_expires_at, users.*
      FROM sessions JOIN users ON users.id = sessions.user_id
      WHERE sessions.id = ? AND sessions.expires_at > ?
    `),
    deleteSession: db.prepare("DELETE FROM sessions WHERE id = ?"),
    deleteExpiredSessions: db.prepare("DELETE FROM sessions WHERE expires_at <= ?"),
    getIntegration: db.prepare("SELECT * FROM integrations WHERE user_id = ? AND provider = ?"),
    listIntegrationsForUser: db.prepare("SELECT * FROM integrations WHERE user_id = ? ORDER BY provider"),
    upsertIntegration: db.prepare(`
      INSERT INTO integrations (
        id, user_id, provider, channel_id, channel_name,
        token_ciphertext, token_iv, token_auth_tag, token_type, topics, connected_at
      ) VALUES (
        @id, @userId, @provider, @channelId, @channelName,
        @tokenCiphertext, @tokenIv, @tokenAuthTag, @tokenType, @topics, @now
      )
      ON CONFLICT (user_id, provider) DO UPDATE SET
        channel_id = excluded.channel_id,
        channel_name = excluded.channel_name,
        token_ciphertext = excluded.token_ciphertext,
        token_iv = excluded.token_iv,
        token_auth_tag = excluded.token_auth_tag,
        token_type = excluded.token_type,
        topics = excluded.topics,
        connected_at = excluded.connected_at
    `),
    deleteIntegration: db.prepare("DELETE FROM integrations WHERE user_id = ? AND provider = ?"),
    insertContactMessage: db.prepare(`
      INSERT INTO contact_messages (id, user_id, first_name, last_name, nickname, email, subject, message, created_at)
      VALUES (@id, @userId, @firstName, @lastName, @nickname, @email, @subject, @message, @now)
    `),
    getContactMessage: db.prepare("SELECT * FROM contact_messages WHERE id = ?")
  };

  return {
    db,

    /** Cree l'utilisateur s'il n'existe pas encore (par twitch_id), sinon met a jour son profil. */
    upsertUserFromTwitch({ twitchId, twitchLogin, displayName, avatarUrl }) {
      const now = Date.now();
      const existing = stmts.getUserByTwitchId.get(twitchId);
      if (existing) {
        stmts.updateUserProfile.run({ id: existing.id, twitchLogin, displayName, avatarUrl: avatarUrl ?? null, now });
        return stmts.getUserById.get(existing.id);
      }
      const id = randomUUID();
      stmts.insertUser.run({ id, twitchId, twitchLogin, displayName, avatarUrl: avatarUrl ?? null, now });
      return stmts.getUserById.get(id);
    },

    getUserByTwitchId(twitchId) {
      return stmts.getUserByTwitchId.get(twitchId) ?? null;
    },

    getUserById(id) {
      return stmts.getUserById.get(id) ?? null;
    },

    /** Cree une session de haute entropie pour l'utilisateur et retourne la ligne creee. */
    createSession(userId, { ttlMs = SESSION_TTL_MS } = {}) {
      const id = randomBytes(32).toString("base64url");
      const now = Date.now();
      const expiresAt = now + ttlMs;
      stmts.insertSession.run({ id, userId, now, expiresAt });
      return { id, userId, createdAt: now, expiresAt };
    },

    /** Retrouve une session valide (non expiree) et l'utilisateur associe, ou null. */
    getSessionWithUser(sessionId) {
      const row = stmts.getSessionWithUser.get(sessionId, Date.now());
      if (!row) return null;
      const { session_id, session_expires_at, ...user } = row;
      return { session: { id: session_id, expiresAt: session_expires_at }, user };
    },

    deleteSession(sessionId) {
      stmts.deleteSession.run(sessionId);
    },

    deleteExpiredSessions() {
      stmts.deleteExpiredSessions.run(Date.now());
    },

    /** Cree ou remplace l'integration d'un utilisateur pour un provider donne. */
    upsertIntegration({ userId, provider, channelId, channelName, tokenCiphertext, tokenIv, tokenAuthTag, tokenType, topics }) {
      const existing = stmts.getIntegration.get(userId, provider);
      const id = existing?.id ?? randomUUID();
      stmts.upsertIntegration.run({
        id,
        userId,
        provider,
        channelId: channelId ?? null,
        channelName: channelName ?? null,
        tokenCiphertext,
        tokenIv,
        tokenAuthTag,
        tokenType: tokenType ?? null,
        topics: topics ?? null,
        now: Date.now()
      });
      return stmts.getIntegration.get(userId, provider);
    },

    getIntegration(userId, provider) {
      return stmts.getIntegration.get(userId, provider) ?? null;
    },

    listIntegrationsForUser(userId) {
      return stmts.listIntegrationsForUser.all(userId);
    },

    deleteIntegration(userId, provider) {
      const result = stmts.deleteIntegration.run(userId, provider);
      return result.changes > 0;
    },

    /** Enregistre un message de contact ; user_id est optionnel (visiteur non connecté). */
    insertContactMessage({ userId, firstName, lastName, nickname, email, subject, message }) {
      const id = randomUUID();
      const now = Date.now();
      stmts.insertContactMessage.run({ id, userId: userId ?? null, firstName, lastName, nickname, email, subject, message, now });
      return stmts.getContactMessage.get(id);
    }
  };
}

mkdirSync(DATA_DIR, { recursive: true });
export const store = createDb(DEFAULT_DB_PATH);
