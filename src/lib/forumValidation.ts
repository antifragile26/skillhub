import { postCategories } from "@/lib/forumCategories";

export const FORUM_PAGE_SIZE = 20;
export const FORUM_TITLE_MAX = 120;
export const FORUM_POST_MAX = 20_000;
export const FORUM_REPLY_MAX = 5_000;

const categoryValues = new Set(postCategories.map((item) => item.value));

export type ForumFieldErrors = {
  title?: string;
  content?: string;
  category?: string;
  case?: string;
};

export function validatePostInput(title: string, content: string, category: string): ForumFieldErrors {
  const errors: ForumFieldErrors = {};
  const normalizedTitle = title.trim();
  const normalizedContent = content.trim();

  if (!normalizedTitle) errors.title = "请输入标题。";
  else if (normalizedTitle.length > FORUM_TITLE_MAX) errors.title = `标题不能超过 ${FORUM_TITLE_MAX} 个字。`;

  if (!normalizedContent) errors.content = "请输入正文。";
  else if (normalizedContent.length > FORUM_POST_MAX) errors.content = `正文不能超过 ${FORUM_POST_MAX} 个字。`;

  if (!categoryValues.has(category)) errors.category = "请选择有效的分类。";
  return errors;
}

export function validateReplyInput(content: string): string | null {
  const normalized = content.trim();
  if (!normalized) return "请输入回复内容。";
  if (normalized.length > FORUM_REPLY_MAX) return `回复不能超过 ${FORUM_REPLY_MAX} 个字。`;
  return null;
}

export function normalizeForumText(value: string) {
  return value.replace(/\r\n?/g, "\n").trim();
}

export function safeReturnPath(value: string | null | undefined, fallback = "/forum") {
  if (!value) return fallback;
  try {
    const parsed = new URL(value, "http://skillhub.local");
    if (parsed.origin !== "http://skillhub.local") return fallback;
    if (!parsed.pathname.startsWith("/")) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function makeRequestId() {
  return crypto.randomUUID();
}
