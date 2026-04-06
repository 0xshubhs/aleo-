/** Leo field modulus - field values must be strictly less than this. */
const FIELD_MODULUS = BigInt("8444461749428370424248824938781546531375899335154063827935233455917409239040");

/**
 * Encode a string as a Leo field (for use in transition inputs).
 * Keeps the value below the field modulus so the wallet/program accept it.
 * Use maxBytes <= 31; lower is safer for compatibility (e.g. 25 for name/bio).
 */
export function stringToField(str: string, maxBytes = 25): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str.slice(0, Math.min(maxBytes, 31)));
  let value = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    value += BigInt(bytes[i]) * BigInt(256) ** BigInt(i);
  }
  value = value % FIELD_MODULUS;
  return `${value}field`;
}

/**
 * Decode a Leo field back to string (for display).
 */
export function fieldToString(field: string): string {
  const value = BigInt(field.replace(/field$/, ""));
  const bytes: number[] = [];
  let v = value;
  const ZERO = BigInt(0);
  const BASE = BigInt(256);
  while (v > ZERO) {
    bytes.push(Number(v % BASE));
    v /= BASE;
  }
  return new TextDecoder().decode(new Uint8Array(bytes)).replace(/\0/g, "");
}

export const PROGRAM_ID = "onchainbio.aleo";
export const CREDITS_PROGRAM_ID = "credits.aleo";
export const GREETING_PROGRAM_ID = "greeting.aleo";

/**
 * Extract one level of message from an unknown value (no recursion).
 */
function getMessageOneLevel(val: unknown): string {
  if (val instanceof Error) return val.message || String(val);
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null) {
    const o = val as Record<string, unknown>;
    const m = o.message ?? o.msg ?? o.data ?? o.error;
    if (typeof m === "string") return m;
    if (m instanceof Error) return m.message;
  }
  return "";
}

/**
 * Extract a user-friendly message from wallet/transaction errors.
 * WalletTransactionError wraps the real error in .error; we dig for message/data.
 */
export function getWalletErrorMessage(error: unknown): string {
  const topMsg = error instanceof Error ? error.message : getMessageOneLevel(error);
  // WalletError subclasses (e.g. WalletTransactionError) store the original in .error
  if (typeof error === "object" && error !== null && "error" in error) {
    const raw = (error as Record<string, unknown>).error;
    const inner = getMessageOneLevel(raw);
    if (inner) return inner;
    // Try nested paths common in wallet errors
    if (raw && typeof raw === "object") {
      const o = raw as Record<string, unknown>;
      const msg = o.message ?? o.msg ?? o.data ?? o.reason ?? o.error;
      if (typeof msg === "string" && msg) return msg;
      if (msg instanceof Error && msg.message) return msg.message;
    }
  }
  if (topMsg) return topMsg;
  const one = getMessageOneLevel(error);
  if (one) return one;
  return String(error);
}

/** Return a debug string from the error (e.g. for "unknown error" cases). */
export function getWalletErrorDebug(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "error" in error) {
    const raw = (error as Record<string, unknown>).error;
    if (raw != null) {
      try {
        return typeof raw === "object" ? JSON.stringify(raw, null, 0).slice(0, 400) : String(raw);
      } catch {
        return String(raw).slice(0, 400);
      }
    }
  }
  return null;
}
