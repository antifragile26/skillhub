type AgentFormValues = {
  name: string;
  category: string;
  frameworks: string;
  description: string;
};

type SkillFormValues = {
  name: string;
  version: string;
  description: string;
  tags: string;
};

export function buildAgentPayload(values: AgentFormValues, userId: string) {
  return {
    name: values.name.trim(),
    category: values.category.trim(),
    frameworks: values.frameworks
      .split(/[\s,，]+/)
      .map((f) => f.trim())
      .filter(Boolean),
    description: values.description.trim(),
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
