// Champ sensible (clé API, secret, token…) : même règle que lib/secrets.mjs
// côté serveur, qui range ces valeurs hors de library/ (suivi par git).
const SECRET_FIELD_PATTERN = /(secret|token|password|passwd|api[_-]?key|client[_-]?id)/i;

export function isSecretFieldKey(key: string): boolean {
  return SECRET_FIELD_PATTERN.test(key);
}

// Type d'input : masqué pour un champ sensible (pas d'affichage en clair à
// l'écran, notamment en live), sinon le type déduit du champ.
export function fieldInputType(key: string, inputType: string): string {
  return inputType === "text" && isSecretFieldKey(key) ? "password" : inputType;
}
