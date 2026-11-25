import { problem } from "./http";

export interface Config {
  cookieSecure: boolean;
  webOrigin: string;
  dbFile: string;
}

let override: Config | null = null;

/** Match Go Open(): HTTP(S) origin only — no path, credentials, query, or fragment. */
export function validateWebOrigin(raw: string): string {
  if (!raw) return "";
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error(
      "WEB_ORIGIN must be an HTTP(S) origin without a path, credentials, query or fragment",
    );
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error(
      "WEB_ORIGIN must be an HTTP(S) origin without a path, credentials, query or fragment",
    );
  }
  if (!u.hostname) {
    throw new Error(
      "WEB_ORIGIN must be an HTTP(S) origin without a path, credentials, query or fragment",
    );
  }
  if (u.username || u.password || u.search || u.hash) {
    throw new Error(
      "WEB_ORIGIN must be an HTTP(S) origin without a path, credentials, query or fragment",
    );
  }
  const withoutSlash = raw.replace(/\/$/, "");
  if (withoutSlash !== `${u.protocol}//${u.host}`) {
    throw new Error(
      "WEB_ORIGIN must be an HTTP(S) origin without a path, credentials, query or fragment",
    );
  }
  return `${u.protocol}//${u.host}`;
}

function readEnvConfig(): Config {
  const rawSecure = process.env.COOKIE_SECURE;
  let cookieSecure = false;
  if (rawSecure !== undefined && rawSecure !== "") {
    if (rawSecure === "true" || rawSecure === "1") cookieSecure = true;
    else if (rawSecure === "false" || rawSecure === "0") cookieSecure = false;
    else throw new Error(`COOKIE_SECURE: invalid boolean ${rawSecure}`);
  }
  return {
    cookieSecure,
    webOrigin: validateWebOrigin(process.env.WEB_ORIGIN ?? ""),
    dbFile: process.env.DB_FILE || "data/trumpet.db",
  };
}

export function getConfig(): Config {
  if (override) return { ...override };
  return readEnvConfig();
}

/** Test helper: pin config like Go's app.Config after Open. */
export function setConfig(config: Config): void {
  override = {
    cookieSecure: config.cookieSecure,
    webOrigin: validateWebOrigin(config.webOrigin),
    dbFile: config.dbFile,
  };
}

export function resetConfig(): void {
  override = null;
}

export function assertMutationOrigin(request: Request): void {
  const origin = request.headers.get("Origin");
  if (!origin) return;
  const config = getConfig();
  let expected = config.webOrigin;
  if (!expected) {
    const host = request.headers.get("host") ?? "";
    expected = `http://${host}`;
  }
  if (origin !== expected) {
    throw problem(403, "invalid_origin", "当前页面无法提交，请重新打开。");
  }
}
