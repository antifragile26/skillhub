import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAgentPayload,
  buildCommentPayload,
  buildSkillPayload,
} from "./contentPayloads.ts";

test("buildAgentPayload trims fields, parses frameworks, and attaches the current user", () => {
  assert.deepEqual(
    buildAgentPayload(
      {
        name: " Research Agent ",
        category: " research ",
        frameworks: "LangGraph, CrewAI  AutoGen",
        description: " Helps research. ",
        repoUrl: " https://github.com/x/agent ",
      },
      "user-1",
    ),
    {
      name: "Research Agent",
      category: "research",
      frameworks: ["LangGraph", "CrewAI", "AutoGen"],
      description: "Helps research.",
      repo_url: "https://github.com/x/agent",
      file_path: null,
      downloads: 0,
      user_id: "user-1",
    },
  );
});

test("buildAgentPayload rejects non-http repo urls and keeps file_path", () => {
  const payload = buildAgentPayload(
    {
      name: "A",
      category: "other",
      frameworks: "",
      description: "d",
      repoUrl: "javascript:alert(1)",
      filePath: "packages/agents/a.zip",
    },
    "user-x",
  );
  assert.equal(payload.repo_url, null);
  assert.equal(payload.file_path, "packages/agents/a.zip");
});

test("buildSkillPayload parses tags and defaults version/downloads", () => {
  assert.deepEqual(
    buildSkillPayload(
      { name: " browser ", version: " ", description: " Automates pages. ", tags: "web, 浏览器  cli" },
      "user-2",
    ),
    {
      name: "browser",
      version: "0.1.0",
      description: "Automates pages.",
      downloads: 0,
      tags: ["web", "浏览器", "cli"],
      repo_url: null,
      file_path: null,
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
