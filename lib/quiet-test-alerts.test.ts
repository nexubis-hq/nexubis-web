import { afterEach, expect, test, vi } from "vitest";
import { quietTestRecipients } from "./quiet-test-alerts";

afterEach(() => vi.unstubAllEnvs());

test("off by default: everyone gets alerts as normal", () => {
  vi.stubEnv("QUIET_TEST_ALERTS_TO", "");
  expect(quietTestRecipients("shannah+t1@nexubis.io")).toBeNull();
});

test("on: test addresses alert only the quiet address", () => {
  vi.stubEnv("QUIET_TEST_ALERTS_TO", "shannah@nexubis.io");
  expect(quietTestRecipients("shannah+t1@nexubis.io")).toEqual(["shannah@nexubis.io"]);
  expect(quietTestRecipients("shannahdt9+t2@gmail.com")).toEqual(["shannah@nexubis.io"]);
});

test("on: a real lead still alerts the whole team", () => {
  vi.stubEnv("QUIET_TEST_ALERTS_TO", "shannah@nexubis.io");
  expect(quietTestRecipients("buyer@factory.nl")).toBeNull();
  expect(quietTestRecipients(undefined)).toBeNull();
});
