type SkillFormValues = {
  name: string;
  version: string;
  description: string;
  category: string;
  repoUrl?: string;
  filePath?: string;
  storageBucket?: string;
  readme?: string;
  license?: string;
  packageName?: string;
  packageSize?: number;
  packageManifest?: Record<string, unknown>;
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

export function buildSkillPayload(values: SkillFormValues, userId: string) {
  return {
    name: values.name.trim(),
    version: values.version.trim() || "0.1.0",
    description: values.description.trim(),
    category: values.category.trim(),
    downloads: 0,
    repo_url: normalizeUrl(values.repoUrl),
    file_path: normalizeFilePath(values.filePath),
    storage_bucket: values.storageBucket === "skill-packages" ? "skill-packages" : "packages",
    readme: values.readme?.trim() || null,
    license: values.license?.trim() || null,
    package_name: values.packageName?.trim() || null,
    package_size: values.packageSize ?? null,
    package_manifest: values.packageManifest ?? {},
    status: "draft",
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
