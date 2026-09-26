export type PostStatus = "draft" | "pending" | "published" | "rejected" | "unpublished";
export type ContentType = "discussion" | "question" | "case";
export type StaffRole = "member" | "operator" | "admin";

export const statusLabels: Record<PostStatus, string> = {
  draft: "草稿",
  pending: "待审核",
  published: "已发布",
  rejected: "已驳回",
  unpublished: "已下架",
};

export const contentTypeLabels: Record<ContentType, string> = {
  discussion: "讨论",
  question: "求助",
  case: "经验分享",
};

export function getSupabaseErrorMessage(message: string) {
  const known: Record<string, string> = {
    not_authenticated: "请先登录后再发布。",
    title_required: "请输入标题。",
    content_required: "请输入正文。",
    invalid_content_type: "内容类型无效，请刷新页面后重试。",
    invalid_product_link: "关联作品参数无效，请从作品详情页重新发帖。",
    forbidden: "没有执行此操作的权限。",
    user_muted: "账号当前被禁言，暂时不能提交互动。",
    case_fields_required: "案例字段未填写完整。",
    reason_required: "请填写处理原因。",
    cannot_moderate_own_post: "不能审核自己提交的内容。",
    cannot_moderate_own_skill: "运营不能审核自己提交的 Skill；管理员可以审核测试 Skill。",
    pin_limit_reached: "置顶最多 3 篇，请先取消其他置顶或调整顺序。",
    published_post_required: "内容必须处于已发布状态。",
    question_owner_required: "只有问题作者可以管理采纳答案。",
    knowledge_fields_required: "知识标题、摘要、步骤、结论和限制条件不能为空。",
    last_admin_protected: "不能移除最后一个管理员。",
    invalid_link: "关联产品已失效或关联不存在。",
    product_unavailable: "该产品当前不可用。",
  };
  const key = Object.keys(known).find((candidate) => message.includes(candidate));
  return key ? known[key] : message;
}

export function hashSessionId(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `s-${(hash >>> 0).toString(16)}`;
}
