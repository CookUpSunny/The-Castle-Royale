import { createVerify } from "node:crypto";
import { grantSecondChanceFromSsv, type Settlement } from "./lossService";
import type { AdStore } from "./store";

export const ADMOB_VERIFIER_KEYS_URL = "https://www.gstatic.com/admob/reward/verifier-keys.json";

export interface AdMobVerifierKey {
  keyId: string;
  pem: string;
}

export function parseVerifierKeys(payload: unknown): AdMobVerifierKey[] {
  if (!payload || typeof payload !== "object" || !("keys" in payload) || !Array.isArray(payload.keys)) {
    return [];
  }
  const keys: AdMobVerifierKey[] = [];
  for (const entry of payload.keys) {
    if (!entry || typeof entry !== "object") continue;
    const keyId = "keyId" in entry ? String(entry.keyId) : "";
    const pem = "pem" in entry && typeof entry.pem === "string" ? entry.pem : "";
    if (keyId && pem) keys.push({ keyId, pem });
  }
  return keys;
}

/**
 * AdMob signs the query string up to, but not including, the signature parameter.
 * `key_id` follows the signature and is not part of the signed payload.
 */
export function splitSignedQuery(queryString: string): { payload: string; signature: string; keyId: string } | null {
  const signatureAt = queryString.indexOf("signature=");
  if (signatureAt <= 0) return null;
  const payload = queryString.slice(0, signatureAt - 1);
  const rest = queryString.slice(signatureAt);
  const params = new URLSearchParams(rest);
  const signature = params.get("signature");
  const keyId = params.get("key_id");
  if (!signature || !keyId) return null;
  return { payload, signature, keyId };
}

export function customDataToOffer(customData: string | null): { offerId: string; nonce: string } | null {
  if (!customData) return null;
  const separator = customData.lastIndexOf("|");
  if (separator <= 0 || separator === customData.length - 1) return null;
  return {
    offerId: customData.slice(0, separator),
    nonce: customData.slice(separator + 1),
  };
}

export function verifyAdMobSignature(payload: string, signature: string, pem: string): boolean {
  const encodings = ["base64url", "base64"] as const;
  for (const encoding of encodings) {
    try {
      const verifier = createVerify("SHA256");
      verifier.update(payload);
      if (verifier.verify(pem, Buffer.from(signature, encoding))) return true;
    } catch {
      // Try the other encoding. A bad signature is not an error.
    }
  }
  return false;
}

function queryValue(queryString: string, name: string): string | null {
  const params = new URLSearchParams(queryString);
  return params.get(name);
}

export interface SsvResult {
  httpStatus: number;
  granted: boolean;
  reason: string;
  settlement: Settlement | null;
}

export async function processAdMobSsv(
  store: AdStore,
  queryString: string,
  keys: ReadonlyMap<string, string>,
  now = new Date(),
): Promise<SsvResult> {
  const signed = splitSignedQuery(queryString);
  if (!signed) {
    return { httpStatus: 400, granted: false, reason: "malformed", settlement: null };
  }
  const pem = keys.get(signed.keyId);
  if (!pem) {
    return { httpStatus: 400, granted: false, reason: "unknown_key", settlement: null };
  }
  if (!verifyAdMobSignature(signed.payload, signed.signature, pem)) {
    return { httpStatus: 403, granted: false, reason: "bad_signature", settlement: null };
  }

  const offer = customDataToOffer(queryValue(queryString, "custom_data"));
  const transactionId = queryValue(queryString, "transaction_id");
  if (!offer || !transactionId) {
    return { httpStatus: 200, granted: false, reason: "missing_reward_fields", settlement: null };
  }

  const result = await grantSecondChanceFromSsv(
    store,
    {
      offerId: offer.offerId,
      nonce: offer.nonce,
      playerId: queryValue(queryString, "user_id"),
      transactionId,
    },
    now,
  );

  return {
    httpStatus: 200,
    granted: result.reason === "granted",
    reason: result.reason,
    settlement: result.settlement,
  };
}
