import assert from "node:assert/strict";
import test from "node:test";

import { getProfileDisplay } from "./profile.ts";

test("uses the display name for the avatar initial", () => {
  assert.deepEqual(
    getProfileDisplay({
      email: "he@example.com",
      user_metadata: { display_name: "和也", username: "heye" },
    }),
    { name: "和也", initial: "和" },
  );
});

test("falls back to the email name when metadata is missing", () => {
  assert.deepEqual(
    getProfileDisplay({ email: "hello@example.com", user_metadata: {} }),
    { name: "hello", initial: "H" },
  );
});
