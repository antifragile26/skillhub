import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCommentPayload,
  buildSkillPayload,
} from "./contentPayloads.ts";

test("buildSkillPayload defaults version/downloads without requiring tags", () => {
  assert.deepEqual(
    buildSkillPayload(
      { name: " browser ", version: " ", description: " Automates pages.", category: "general-tools" },
      "user-2",
    ),
    {
      name: "browser",
      version: "0.1.0",
      description: "Automates pages.",
      category: "general-tools",
      downloads: 0,
      repo_url: null,
      file_path: null,
      storage_bucket: "packages",
      readme: null,
      license: null,
      package_name: null,
      package_size: null,
      package_manifest: {},
      status: "draft",
      user_id: "user-2",
    },
  );
});

test("buildCommentPayload trims content and attaches post/user ids", () => {
  assert.deepEqual(buildCommentPayload("post-1", "user-3", "  收到，感谢分享。 "), {
    post_id: "post-1",
    user_id: "user-3",
    content: "收到，感谢分享。",
  });
});
