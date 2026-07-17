import assert from "node:assert/strict";
import { describe, it } from "node:test";

const {
  dateInputToTransactionTimestamp,
  isValidTransactionDateInput,
  transactionTimestampToDateInput,
} = (await import(new URL("./transaction-date.ts", import.meta.url).href)) as typeof import("./transaction-date");

describe("transaction date helpers", () => {
  it("stores a date input as a stable midday local timestamp", () => {
    assert.equal(
      dateInputToTransactionTimestamp("2026-07-17"),
      "2026-07-17T12:00:00.000"
    );
  });

  it("returns today's date when the date input is empty", () => {
    const timestamp = dateInputToTransactionTimestamp("");
    assert.ok(timestamp);
    assert.match(timestamp, /^\d{4}-\d{2}-\d{2}T12:00:00\.000$/);
  });

  it("rejects malformed date inputs", () => {
    assert.equal(isValidTransactionDateInput("2026-7-17"), false);
    assert.equal(isValidTransactionDateInput("not-a-date"), false);
  });

  it("converts stored timestamps back to a date input value", () => {
    assert.equal(
      transactionTimestampToDateInput("2026-07-17T12:00:00.000"),
      "2026-07-17"
    );
  });
});
