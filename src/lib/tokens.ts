import crypto from "crypto";

const SIGNING_SECRET = process.env.SIGNING_SECRET || "dev-secret-change-in-prod";
const TOKEN_EXPIRY_HOURS = 24;

interface TokenPayload {
  signatureId: string;
  petitionId: string;
  exp: number;
}

export function signToken(payload: Omit<TokenPayload, "exp">): string {
  const exp = Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;
  const data: TokenPayload = { ...payload, exp };
  const json = JSON.stringify(data);
  const hmac = crypto
    .createHmac("sha256", SIGNING_SECRET)
    .update(json)
    .digest("hex");

  return Buffer.from(JSON.stringify({ d: data, s: hmac })).toString("base64url");
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = JSON.parse(
      Buffer.from(token, "base64url").toString("utf8")
    );
    const { d, s } = decoded;

    // Verify HMAC
    const expected = crypto
      .createHmac("sha256", SIGNING_SECRET)
      .update(JSON.stringify(d))
      .digest("hex");

    if (s !== expected) {
      return null;
    }

    // Check expiry
    if (Date.now() > d.exp) {
      return null;
    }

    return d as TokenPayload;
  } catch {
    return null;
  }
}
