import { decryptToken, encryptToken } from "./crypto.mjs";
import { store as defaultStore } from "./db.mjs";

/** Chiffre un token colle manuellement et l'enregistre comme integration de l'utilisateur. */
export function saveManualToken({ userId, provider, channelId, channelName, token, tokenType, topics }, store = defaultStore) {
  const { ciphertext, iv, authTag } = encryptToken(token);
  const row = store.upsertIntegration({
    userId,
    provider,
    channelId,
    channelName,
    tokenCiphertext: ciphertext,
    tokenIv: iv,
    tokenAuthTag: authTag,
    tokenType,
    topics
  });
  return maskIntegration(row);
}

/** Dechiffre le token stocke pour un provider donne. A n'utiliser que server-side, au moment d'ouvrir une connexion live. */
export function decryptIntegrationToken(row) {
  return decryptToken({ ciphertext: row.token_ciphertext, iv: row.token_iv, authTag: row.token_auth_tag });
}

/** Ne retourne jamais le secret : uniquement le statut/metadonnees exposables a la page compte. */
export function maskIntegration(row) {
  return {
    provider: row.provider,
    channelId: row.channel_id,
    channelName: row.channel_name,
    tokenType: row.token_type,
    connectedAt: row.connected_at,
    lastVerifiedAt: row.last_verified_at
  };
}

export function disconnectIntegration(userId, provider, store = defaultStore) {
  return store.deleteIntegration(userId, provider);
}
