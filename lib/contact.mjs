import { store as defaultStore } from "./db.mjs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 80;
const MAX_SUBJECT = 150;
const MAX_MESSAGE = 4000;

/** Valide les champs d'un message de contact ; lève une erreur au premier probleme rencontre. */
export function validateContactMessage({ firstName, lastName, email, subject, message }) {
  if (!firstName?.trim() || firstName.trim().length > MAX_NAME) throw new Error("Prénom invalide");
  if (!lastName?.trim() || lastName.trim().length > MAX_NAME) throw new Error("Nom invalide");
  if (!email?.trim() || !EMAIL_RE.test(email.trim())) throw new Error("Email invalide");
  if (!subject?.trim() || subject.trim().length > MAX_SUBJECT) throw new Error("Sujet invalide");
  if (!message?.trim() || message.trim().length > MAX_MESSAGE) throw new Error("Message invalide");
}

/** Valide puis enregistre un message de contact ; userId optionnel si le visiteur est connecte. */
export function saveContactMessage({ userId, firstName, lastName, email, subject, message }, store = defaultStore) {
  const trimmed = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim(),
    subject: subject.trim(),
    message: message.trim()
  };
  validateContactMessage(trimmed);
  return store.insertContactMessage({ userId: userId ?? null, ...trimmed });
}
