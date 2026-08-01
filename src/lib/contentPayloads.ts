type AgentFormValues = {
  name: string;
  category: string;
  frameworks: string;
  description: string;
  repoUrl?: string;
  filePath?: string;
};

type SkillFormValues = {
  name: string;
  version: string;
  description: string;
  tags: string;
  repoUrl?: string;
  filePath?: string;
};

// 只接受 http(s) 链接，其余（空串、javascript: 等）归一化成 null
function normalizeUrl(value?: string): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

function normalizeFilePath(value?: string): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed || null;
}

export function buildAgentPayload(values: AgentFormValues, userId: string) {
  return {
    name: values.name.trim(),
    category: values.category.trim(),
    frameworks: values.frameworks
      .split(/[\s,，]+/)
      .map((f) => f.trim())
      .filter(Boolean),
    description: values.description.trim(),
    repo_url: normalizeUrl(values.repoUrl),
    file_path: normalizeFilePath(values.filePath),
    downloads: 0,
    user_id: userId,
  };
}

export function buildSkillPayload(values: SkillFormValues, userId: string) {
  return {
    name: values.name.trim(),
    version: values.version.trim() || "0.1.0",
    description: values.description.trim(),
    downloads: 0,
    tags: values.tags
      .split(/[\s,，]+/)
      .map((tag) => tag.trim())
      .filter(Boolean),
    repo_url: normalizeUrl(values.repoUrl),
    file_path: normalizeFilePath(values.filePath),
    user_id: userId,
  };
}

export function buildCommentPayload(postId: string, userId: string, content: string) {
  return {
    post_id: postId,
    user_id: userId,
    content: content.trim(),
  };
}
