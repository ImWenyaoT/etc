import { describe, expect, it } from "vitest";
import { InvalidDocumentError, UnsupportedFormatError, parse } from "./parser";

describe("parse", () => {
  it("parses json, yaml, and xml into JSON-compatible values", () => {
    const cases: { f: string; s: string; want: unknown }[] = [
      { f: "json", s: `{"ok":true}`, want: { ok: true } },
      {
        f: "yaml",
        s: "name: Ada\nitems: [1, 2]",
        want: { items: [1, 2], name: "Ada" },
      },
      {
        f: "xml",
        s: `<tags id="1"><tag>a</tag><tag>b</tag></tags>`,
        want: {
          tags: {
            $attributes: { id: "1" },
            tag: [{ $text: "a" }, { $text: "b" }],
          },
        },
      },
    ];
    for (const c of cases) {
      const r = parse(c.s, "", c.f);
      expect(r.data).toEqual(c.want);
      expect(r.format).toBe(c.f);
    }
  });

  it("rejects invalid documents and unsupported formats", () => {
    const cases: { f: string; s: string }[] = [
      { f: "json", s: "{" },
      { f: "yaml", s: "a: [" },
      { f: "xml", s: "<a><b></a>" },
      { f: "xml", s: "<a/><b/>" },
      { f: "xml", s: "" },
      { f: "yaml", s: "a: 1\n---\nb: 2" },
      { f: "toml", s: "x" },
    ];
    for (const c of cases) {
      expect(() => parse(c.s, "", c.f)).toThrow();
    }
  });
});

describe("error classification", () => {
  it("distinguishes unsupported format from invalid documents", () => {
    expect(() => parse("x", "", "toml")).toThrow(UnsupportedFormatError);
    expect(() => parse("{", "", "json")).toThrow(InvalidDocumentError);
    expect(() => parse("a: [", "", "yaml")).toThrow(InvalidDocumentError);
    expect(() => parse("<a><b></a>", "", "xml")).toThrow(InvalidDocumentError);
  });
});

describe("format detection and empty YAML", () => {
  it("detects yml extension and preserves source path", () => {
    const result = parse("name: Ada", "example.YML", "");
    expect(result.format).toBe("yaml");
    expect(result.sourcePath).toBe("example.YML");
    expect(result.data).toEqual({ name: "Ada" });
  });

  it("treats empty YAML as null", () => {
    const result = parse("", "", "yaml");
    expect(result.data).toBeNull();
  });
});

describe("XML limits", () => {
  it("allows 256 nested elements and rejects deeper nesting and directives", () => {
    const atLimit = "<a>".repeat(256) + "</a>".repeat(256);
    expect(() => parse(atLimit, "", "xml")).not.toThrow();

    const beyondLimit = "<a>" + atLimit + "</a>";
    expect(() => parse(beyondLimit, "", "xml")).toThrow(InvalidDocumentError);
    expect(() => parse(`<!DOCTYPE a><a/>`, "", "xml")).toThrow(
      InvalidDocumentError,
    );
  });

  it("preserves underlying JSON syntax errors in the cause chain", () => {
    try {
      parse("{", "", "json");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidDocumentError);
      expect((error as Error).message).toMatch(/^failed to parse json:/);
      expect((error as InvalidDocumentError).cause).toBeInstanceOf(SyntaxError);
    }
  });
});
