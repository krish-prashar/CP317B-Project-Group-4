import { describe, expect, it } from "vitest";
import { checkReading, metricsFromRules } from "./validation.js";
import { niceTicks, summarize } from "./chart.js";
import { asDate, metricLabel } from "./format.js";
import { resolveRange } from "../pages/Trends.jsx";

const RULES = {
  heart_rate: { label: "Heart rate", units: { bpm: { hard: [20, 300], normal: [40, 120] } } },
};

describe("checkReading (Data Validation)", () => {
  it("accepts a normal value", () => {
    expect(checkReading(RULES, "heart_rate", 72, "bpm")).toEqual({});
  });
  it("warns outside the normal range", () => {
    expect(checkReading(RULES, "heart_rate", 135, "bpm").warning).toMatch(/outside the normal range/);
  });
  it("rejects impossible values", () => {
    expect(checkReading(RULES, "heart_rate", 720, "bpm").error).toMatch(/not possible/);
  });
  it("treats range edges as normal", () => {
    expect(checkReading(RULES, "heart_rate", 40, "bpm")).toEqual({});
    expect(checkReading(RULES, "heart_rate", 120, "bpm")).toEqual({});
  });
  it("ignores metrics without a rule", () => {
    expect(checkReading(RULES, "steps", 99999, "steps")).toEqual({});
  });
  it("builds the metric list from the rules", () => {
    expect(metricsFromRules(RULES)).toEqual({ heart_rate: { label: "Heart rate", units: ["bpm"] } });
  });
});

describe("resolveRange (Historical Trends)", () => {
  const now = new Date("2026-11-13T12:00:00");
  it("presets count back from now", () => {
    const r = resolveRange("7", "", "", now);
    expect(r.end).toEqual(now);
    expect((now - r.start) / 864e5).toBe(7);
  });
  it("custom range covers whole days", () => {
    const r = resolveRange("custom", "2026-11-01", "2026-11-05", now);
    expect(r.start).toEqual(new Date("2026-11-01T00:00"));
    expect(r.end).toEqual(new Date("2026-11-05T23:59:59.999"));
  });
  it("rejects start after end", () => {
    expect(resolveRange("custom", "2026-11-10", "2026-11-01", now).error).toMatch(/start date/);
  });
  it("requires both dates", () => {
    expect(resolveRange("custom", "", "2026-11-01", now).error).toBeTruthy();
  });
  it("never ends in the future", () => {
    expect(resolveRange("custom", "2026-11-01", "2026-12-31", now).end).toEqual(now);
  });
});

describe("chart helpers", () => {
  it("makes round tick values covering the data", () => {
    const ticks = niceTicks(36, 135);
    expect(ticks[0]).toBeLessThanOrEqual(36);
    expect(ticks.at(-1)).toBeGreaterThanOrEqual(135);
    expect(ticks).toEqual([20, 40, 60, 80, 100, 120, 140]);
  });
  it("handles a single value", () => {
    expect(niceTicks(70, 70).length).toBeGreaterThan(1);
  });
  it("summarizes points", () => {
    const s = summarize([{ v: 70 }, { v: 80, flag: "Above" }, { v: 90 }]);
    expect(s).toEqual({ count: 3, latest: 90, min: 70, max: 90, avg: 80, flagged: 1 });
  });
});

describe("format helpers", () => {
  it("treats timestamps without a timezone as UTC", () => {
    expect(asDate("2026-11-01T10:00:00").toISOString()).toBe("2026-11-01T10:00:00.000Z");
  });
  it("labels unknown metrics readably", () => {
    expect(metricLabel("skeletal_muscle_mass", {})).toBe("Skeletal muscle mass");
  });
});
