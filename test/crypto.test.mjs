import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { EncryptionKeyError, decryptToken, encryptToken, loadEncryptionKey } from "../lib/crypto.mjs";

const testKey = randomBytes(32);

test("chiffre puis dechiffre un texte en clair", () => {
  const encrypted = encryptToken("mon-token-secret", testKey);
  assert.notEqual(encrypted.ciphertext, "mon-token-secret");
  assert.equal(decryptToken(encrypted, testKey), "mon-token-secret");
});

test("le dechiffrement echoue avec la mauvaise cle", () => {
  const encrypted = encryptToken("secret", testKey);
  const wrongKey = randomBytes(32);
  assert.throws(() => decryptToken(encrypted, wrongKey));
});

test("le dechiffrement echoue si le ciphertext est altere", () => {
  const encrypted = encryptToken("secret", testKey);
  const tampered = { ...encrypted, ciphertext: Buffer.from("altere-altere-altere").toString("base64") };
  assert.throws(() => decryptToken(tampered, testKey));
});

test("le dechiffrement echoue si le authTag est altere", () => {
  const encrypted = encryptToken("secret", testKey);
  const tamperedTag = Buffer.from(encrypted.authTag, "base64");
  tamperedTag[0] ^= 0xff;
  const tampered = { ...encrypted, authTag: tamperedTag.toString("base64") };
  assert.throws(() => decryptToken(tampered, testKey));
});

test("loadEncryptionKey refuse une cle absente", () => {
  assert.throws(() => loadEncryptionKey(""), EncryptionKeyError);
  assert.throws(() => loadEncryptionKey(undefined), EncryptionKeyError);
});

test("loadEncryptionKey refuse une cle qui ne fait pas 32 octets", () => {
  assert.throws(() => loadEncryptionKey(Buffer.from("trop-court").toString("base64")), EncryptionKeyError);
});

test("loadEncryptionKey accepte une cle base64 de 32 octets", () => {
  const key = loadEncryptionKey(testKey.toString("base64"));
  assert.equal(key.length, 32);
});
