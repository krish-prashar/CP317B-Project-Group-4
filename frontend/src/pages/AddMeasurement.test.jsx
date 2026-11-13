import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import AddMeasurement from "./AddMeasurement.jsx";

const RULES = {
  heart_rate: { label: "Heart rate", units: { bpm: { hard: [20, 300], normal: [40, 120] } } },
};
const METRICS = { heart_rate: { label: "Heart rate", units: ["bpm"] } };

function setup() {
  const api = vi.fn().mockResolvedValue({ id: 1, flag_reason: "Above normal range (40–120 bpm)" });
  const props = { api, rules: RULES, metrics: METRICS, onNavigate: vi.fn(), onToast: vi.fn() };
  render(<AddMeasurement {...props} />);
  const enter = value => {
    fireEvent.change(screen.getByLabelText("Value"), { target: { value } });
    fireEvent.click(screen.getByText("Save Measurement"));
  };
  return { ...props, enter };
}

afterEach(cleanup);

describe("Add Measurement validation", () => {
  it("rejects an impossible value without calling the API", () => {
    const { api, enter } = setup();
    enter("720");
    expect(screen.getByText(/not possible/)).toBeTruthy();
    expect(api).not.toHaveBeenCalled();
  });

  it("asks for confirmation before saving an out-of-range value", async () => {
    const { api, enter, onToast, onNavigate } = setup();
    enter("135");
    expect(screen.getByText(/outside the normal range/)).toBeTruthy();
    expect(api).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Save and flag"));
    await vi.waitFor(() => expect(onNavigate).toHaveBeenCalledWith("history"));
    expect(api).toHaveBeenCalledWith("/measurements", expect.objectContaining({ method: "POST" }));
    expect(onToast).toHaveBeenCalledWith("Measurement saved and flagged for review.");
  });

  it("saves a normal value straight away", async () => {
    const { api, enter } = setup();
    enter("72");
    await vi.waitFor(() => expect(api).toHaveBeenCalledTimes(1));
    expect(api.mock.calls[0][1].json).toMatchObject({ metric: "heart_rate", value: 72, unit: "bpm" });
  });

  it("requires a value", () => {
    const { api, enter } = setup();
    enter("");
    expect(screen.getByText("Enter a value.")).toBeTruthy();
    expect(api).not.toHaveBeenCalled();
  });
});
