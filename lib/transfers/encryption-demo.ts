import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "crypto";
import { DEMO_REGULATOR_VIEW_KEY } from "@/lib/transfers/transfer-rail-fixtures";
import type { ComplianceMemo } from "@/lib/transfers/transfer-rail-types";

const algorithm = "aes-256-gcm";
const salt = "trueavail-transfer-demo";

function keyFromViewKey(viewKey: string) {
  return scryptSync(viewKey, salt, 32);
}

function toBase64Url(buffer: Buffer) {
  return buffer.toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url");
}

export function hashMemo(memo: ComplianceMemo): `0x${string}` {
  return `0x${createHash("sha256").update(JSON.stringify(memo)).digest("hex")}`;
}

export function bytes32MemoHash(memo: ComplianceMemo): `0x${string}` {
  return hashMemo(memo);
}

export function encryptComplianceMemo(memo: ComplianceMemo, viewKey = DEMO_REGULATOR_VIEW_KEY) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, keyFromViewKey(viewKey), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(memo), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const encryptedMemo = [
    "mvp-aes-gcm",
    toBase64Url(iv),
    toBase64Url(authTag),
    toBase64Url(encrypted),
  ].join(".");

  return {
    encryptedMemo,
    memoHash: hashMemo(memo),
    encryptedMemoBytes32: bytes32MemoHash(memo),
  };
}

export function decryptComplianceMemo(encryptedMemo: string, viewKey: string): ComplianceMemo | null {
  const [version, ivValue, authTagValue, encryptedValue] = encryptedMemo.split(".");
  if (version !== "mvp-aes-gcm" || !ivValue || !authTagValue || !encryptedValue) {
    return null;
  }

  try {
    const decipher = createDecipheriv(algorithm, keyFromViewKey(viewKey), fromBase64Url(ivValue));
    decipher.setAuthTag(fromBase64Url(authTagValue));
    const decrypted = Buffer.concat([decipher.update(fromBase64Url(encryptedValue)), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8")) as ComplianceMemo;
  } catch {
    return null;
  }
}
