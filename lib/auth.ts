import { createHmac, timingSafeEqual } from "crypto";

type AdminTokenPayload = {
  sub: string;
  exp: number;
};

const DEFAULT_ADMIN_USERNAME = "ADMIN";
const DEFAULT_ADMIN_PASSWORD = "ADMIN@123";

function getAdminUsername() {
  return process.env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME;
}

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
}

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET || getAdminPassword();
}

function toBase64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function isAdminCredential(username: unknown, password: unknown) {
  return username === getAdminUsername() && password === getAdminPassword();
}

export function createAdminToken() {
  const payload: AdminTokenPayload = {
    sub: getAdminUsername(),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyAdminToken(token: string | null) {
  if (!token) {
    return false;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AdminTokenPayload;
    return payload.sub === getAdminUsername() && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
