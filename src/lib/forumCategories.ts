// 论坛分类：英文 value 存进数据库，中文 label 用于显示。
// 发帖页和论坛列表共用这一份，保证一致。
export const postCategories = [
  { value: "question", label: "使用求助" },
  { value: "showcase", label: "使用经验" },
  { value: "skill_exchange", label: "Skill 开发与改进" },
  { value: "general", label: "综合讨论" },
];

const legacyCategoryLabels: Record<string, string> = {
  bug_report: "Bug 反馈",
  security_audit: "安全审计",
  review: "评审",
  other: "其他",
};

const categoryFilterGroups: Record<string, string[]> = {
  question: ["question", "bug_report"],
  showcase: ["showcase"],
  skill_exchange: ["skill_exchange", "security_audit", "review"],
  general: ["general", "other"],
};

const legacyCategoryGroups: Record<string, string> = {
  bug_report: "question",
  security_audit: "skill_exchange",
  review: "skill_exchange",
  other: "general",
};

export function normalizeForumCategory(value?: string | null) {
  if (!value) return "";
  return legacyCategoryGroups[value] ?? value;
}

export function categoryFilterValues(value?: string | null) {
  if (!value) return [];
  const normalized = normalizeForumCategory(value);
  return categoryFilterGroups[normalized] ?? [value];
}

export function composerCategory(value?: string | null) {
  return normalizeForumCategory(value);
}

export function categoryForContentType(type: "discussion" | "question" | "case") {
  if (type === "case") return "showcase";
  if (type === "discussion") return "skill_exchange";
  return "question";
}

export function contentTypeForCategory(value?: string | null): "discussion" | "question" | "case" {
  const normalized = normalizeForumCategory(value);
  if (normalized === "question") return "question";
  if (normalized === "showcase") return "case";
  return "discussion";
}

// 由 value 查中文 label；查不到就原样返回。
export function categoryLabel(value?: string | null) {
  if (!value) return "";
  return postCategories.find((c) => c.value === value)?.label ?? legacyCategoryLabels[value] ?? value;
}
