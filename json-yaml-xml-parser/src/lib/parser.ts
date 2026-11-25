import path from "node:path";
import { parseAllDocuments } from "yaml";

export class UnsupportedFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedFormatError";
  }
}

export class InvalidDocumentError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "InvalidDocumentError";
  }
}

export type ParseResult = {
  format: string;
  data: unknown;
  sourcePath?: string;
};

/** Detect uses an explicit format or the path extension; yml is normalized to yaml. */
export function detect(filePath: string, format: string): string {
  let f = format;
  if (!f) {
    f = path.extname(filePath).replace(/^\./, "");
  }
  f = f.toLowerCase();
  if (f === "yml") f = "yaml";
  if (f === "json" || f === "yaml" || f === "xml") return f;
  throw new UnsupportedFormatError(`unsupported or missing format: "${f}"`);
}

/**
 * Parse decodes exactly one document. Empty YAML is null; empty JSON and XML
 * are invalid. XML directives and more than 256 nested elements are rejected.
 */
export function parse(source: string, filePath = "", format = ""): ParseResult {
  const f = detect(filePath, format);
  try {
    let data: unknown;
    switch (f) {
      case "json":
        data = JSON.parse(source);
        break;
      case "yaml":
        data = parseYaml(source);
        break;
      case "xml":
        data = parseXml(source);
        break;
    }
    const result: ParseResult = { format: f, data };
    if (filePath) result.sourcePath = filePath;
    return result;
  } catch (error) {
    if (error instanceof UnsupportedFormatError) throw error;
    if (error instanceof InvalidDocumentError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new InvalidDocumentError(`failed to parse ${f}: ${message}`, {
      cause: error,
    });
  }
}

function parseYaml(source: string): unknown {
  const docs = parseAllDocuments(source);
  // Match Go yaml.Decoder: empty input → EOF → null; a second document → error.
  if (docs.length > 1) {
    throw new Error("multiple YAML documents are not supported");
  }
  const doc = docs[0];
  if (!doc) return null;
  if (doc.errors.length > 0) {
    throw doc.errors[0];
  }
  // Empty document (EOF / no node) → null
  if (doc.contents == null) return null;
  const data = doc.toJS({ mapAsMap: false });
  // Normalize via JSON round-trip so mapping keys are JSON strings.
  return JSON.parse(JSON.stringify(data ?? null));
}

function add(map: Record<string, unknown>, key: string, value: unknown): void {
  if (Object.prototype.hasOwnProperty.call(map, key)) {
    const old = map[key];
    if (Array.isArray(old)) {
      old.push(value);
    } else {
      map[key] = [old, value];
    }
  } else {
    map[key] = value;
  }
}

type XmlElement = {
  name: string;
  value: Record<string, unknown>;
  text: string;
};

type XmlToken =
  | {
      kind: "start";
      name: string;
      attrs: Record<string, string>;
      selfClosing: boolean;
    }
  | { kind: "end"; name: string }
  | { kind: "text"; value: string }
  | { kind: "directive" };

function parseXml(source: string): unknown {
  const tokens = tokenizeXml(source);
  const stack: XmlElement[] = [];
  let root: Record<string, unknown> | null = null;

  const finish = (el: XmlElement) => {
    const trimmed = el.text.trim();
    if (trimmed !== "") el.value.$text = trimmed;
    if (stack.length > 0) {
      add(stack[stack.length - 1]!.value, el.name, el.value);
    } else {
      if (root !== null) throw new Error("multiple roots");
      root = { [el.name]: el.value };
    }
  };

  for (const tok of tokens) {
    switch (tok.kind) {
      case "start": {
        if (stack.length >= 256) {
          throw new Error("XML nesting limit exceeded");
        }
        const el: XmlElement = { name: tok.name, value: {}, text: "" };
        if (Object.keys(tok.attrs).length > 0) {
          el.value.$attributes = { ...tok.attrs };
        }
        if (tok.selfClosing) {
          finish(el);
        } else {
          stack.push(el);
        }
        break;
      }
      case "text": {
        if (stack.length > 0) {
          stack[stack.length - 1]!.text += tok.value;
        } else if (tok.value.trim() !== "") {
          throw new Error("text outside root");
        }
        break;
      }
      case "end": {
        if (stack.length === 0) {
          throw new Error("unexpected end element");
        }
        const top = stack[stack.length - 1]!;
        if (top.name !== tok.name) {
          throw new Error(`element <${top.name}> closed by </${tok.name}>`);
        }
        stack.pop();
        finish(top);
        break;
      }
      case "directive":
        throw new Error("XML directives are not supported");
    }
  }

  if (root === null || stack.length > 0) {
    throw new Error("missing or incomplete root");
  }
  return root;
}

function localName(name: string): string {
  const i = name.indexOf(":");
  return i >= 0 ? name.slice(i + 1) : name;
}

function tokenizeXml(source: string): XmlToken[] {
  const tokens: XmlToken[] = [];
  let i = 0;
  const s = source;

  while (i < s.length) {
    if (s[i] === "<") {
      if (s.startsWith("<!--", i)) {
        const end = s.indexOf("-->", i + 4);
        if (end < 0) throw new Error("unclosed comment");
        i = end + 3;
        continue;
      }
      if (s.startsWith("<![CDATA[", i)) {
        const end = s.indexOf("]]>", i + 9);
        if (end < 0) throw new Error("unclosed CDATA");
        tokens.push({ kind: "text", value: s.slice(i + 9, end) });
        i = end + 3;
        continue;
      }
      if (s.startsWith("<!", i)) {
        tokens.push({ kind: "directive" });
        const end = findTagEnd(s, i + 2);
        if (end < 0) throw new Error("unclosed directive");
        i = end + 1;
        continue;
      }
      if (s.startsWith("<?", i)) {
        const end = s.indexOf("?>", i + 2);
        if (end < 0) throw new Error("unclosed processing instruction");
        i = end + 2;
        continue;
      }
      if (s.startsWith("</", i)) {
        const end = findTagEnd(s, i + 2);
        if (end < 0) throw new Error("unclosed end tag");
        const raw = s.slice(i + 2, end).trim();
        if (!raw) throw new Error("empty end tag");
        tokens.push({ kind: "end", name: localName(raw.split(/\s+/)[0]!) });
        i = end + 1;
        continue;
      }
      const end = findTagEnd(s, i + 1);
      if (end < 0) throw new Error("unclosed start tag");
      let inner = s.slice(i + 1, end).trim();
      let selfClosing = false;
      if (inner.endsWith("/")) {
        selfClosing = true;
        inner = inner.slice(0, -1).trim();
      }
      if (!inner) throw new Error("empty start tag");
      const { name, attrs } = parseStartTag(inner);
      tokens.push({
        kind: "start",
        name: localName(name),
        attrs,
        selfClosing,
      });
      i = end + 1;
      continue;
    }
    const next = s.indexOf("<", i);
    const end = next < 0 ? s.length : next;
    tokens.push({ kind: "text", value: decodeXmlEntities(s.slice(i, end)) });
    i = end;
  }
  return tokens;
}

function findTagEnd(s: string, from: number): number {
  let inQuote: '"' | "'" | null = null;
  for (let i = from; i < s.length; i++) {
    const c = s[i]!;
    if (inQuote) {
      if (c === inQuote) inQuote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      inQuote = c;
      continue;
    }
    if (c === ">") return i;
  }
  return -1;
}

function parseStartTag(inner: string): {
  name: string;
  attrs: Record<string, string>;
} {
  const nameMatch = /^([^\s/]+)/.exec(inner);
  if (!nameMatch) throw new Error("invalid start tag");
  const name = nameMatch[1]!;
  const attrs: Record<string, string> = {};
  const rest = inner.slice(name.length);
  const attrRe =
    /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s'"=<>`]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(rest)) !== null) {
    const key = localName(m[1]!);
    attrs[key] = decodeXmlEntities(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return { name, attrs };
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#([0-9]+);/g, (_, dec: string) =>
      String.fromCodePoint(Number.parseInt(dec, 10)),
    )
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
