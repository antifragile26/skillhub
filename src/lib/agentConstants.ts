// Agent 框架选项（一个 agent 可支持多个框架）
export const agentFrameworks = [
  "LangGraph",
  "CrewAI",
  "AutoGen",
  "LangChain",
  "Semantic Kernel",
  "其他",
];

// Agent 类别（单选，描述 agent 的主要用途）
export const agentCategories = [
  { value: "research", label: "研究分析" },
  { value: "coding", label: "代码开发" },
  { value: "content", label: "内容创作" },
  { value: "workflow", label: "自动化工作流" },
  { value: "other", label: "其他" },
];

// 由 value 查中文 label；查不到就原样返回。
export function agentCategoryLabel(value?: string | null) {
  if (!value) return "";
  return agentCategories.find((c) => c.value === value)?.label ?? value;
}
