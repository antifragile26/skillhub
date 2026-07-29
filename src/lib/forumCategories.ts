// 论坛分类：英文 value 存进数据库，中文 label 用于显示。
// 发帖页和论坛列表共用这一份，保证一致。
export const postCategories = [
  { value: "question", label: "提问" },
  { value: "bug_report", label: "Bug 反馈" },
  { value: "showcase", label: "作品展示" },
  { value: "general", label: "综合讨论" },
  { value: "skill_exchange", label: "Skill 交流" },
  { value: "security_audit", label: "安全审计" },
  { value: "review", label: "评审" },
  { value: "other", label: "其他" },
];

// 由 value 查中文 label；查不到就原样返回。
export function categoryLabel(value?: string | null) {
  if (!value) return "";
  return postCategories.find((c) => c.value === value)?.label ?? value;
}
