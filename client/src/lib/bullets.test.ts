import { describe, it, expect } from "vitest";
import {
  isBulletLine,
  stripMarker,
  parseBullets,
  looksLikeBullets,
} from "./bullets";

describe("isBulletLine", () => {
  it("recognizes dash, star, plus, and middot markers", () => {
    expect(isBulletLine("- item")).toBe(true);
    expect(isBulletLine("* item")).toBe(true);
    expect(isBulletLine("+ item")).toBe(true);
    expect(isBulletLine("• item")).toBe(true);
  });
  it("recognizes numbered and lettered markers", () => {
    expect(isBulletLine("1. item")).toBe(true);
    expect(isBulletLine("2) item")).toBe(true);
    expect(isBulletLine("a. item")).toBe(true);
  });
  it("rejects a plain sentence", () => {
    expect(isBulletLine("this is a sentence")).toBe(false);
  });
  it("rejects a hyphen with no following space (a word)", () => {
    expect(isBulletLine("-well then")).toBe(false);
  });
});

describe("stripMarker", () => {
  it("removes the marker and trims", () => {
    expect(stripMarker("-  buy milk")).toBe("buy milk");
    expect(stripMarker("1. call the bank")).toBe("call the bank");
  });
});

describe("parseBullets", () => {
  it("extracts content from a marked list", () => {
    const text = "- buy milk\n- call the bank\n* water plants";
    expect(parseBullets(text)).toEqual(["buy milk", "call the bank", "water plants"]);
  });
  it("ignores blank and non-bullet lines within a marked list", () => {
    const text = "notes:\n- one\n\n- two";
    expect(parseBullets(text)).toEqual(["one", "two"]);
  });
  it("falls back to non-empty lines when there are no markers", () => {
    const text = "first thought\nsecond thought";
    expect(parseBullets(text)).toEqual(["first thought", "second thought"]);
  });
});

describe("looksLikeBullets", () => {
  it("is true for two or more marked lines", () => {
    expect(looksLikeBullets("- a\n- b")).toBe(true);
    expect(looksLikeBullets("1. a\n2. b\n3. c")).toBe(true);
  });
  it("is true for a single marked line", () => {
    expect(looksLikeBullets("- just one")).toBe(true);
  });
  it("is false for prose", () => {
    expect(looksLikeBullets("This is a normal paragraph of writing.")).toBe(false);
  });
  it("is false for two plain lines", () => {
    expect(looksLikeBullets("line one\nline two")).toBe(false);
  });
});
