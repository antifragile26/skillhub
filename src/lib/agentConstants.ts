// Agent 框架选项（一个 agent 可支持多个框架）
export const agentFrameworks = [
  "LangGraph",
  "CrewAI",
  "AutoGen",
  "LangChain",
  "Semantic Kernel",
  "Other",
];

// Agent 类别（单选，按用途/场景分类）
export const agentCategories = [
  { value: "coding", label: "代码开发" },
  { value: "research", label: "研究分析" },
  { value: "content", label: "内容创作" },
  { value: "data", label: "数据处理" },
  { value: "customer-service", label: "客服对话" },
  { value: "workflow", label: "自动化工作流" },
  { value: "multi-agent", label: "多智能体协作" },
  { value: "other", label: "其他" },
];

// 由 value 查中文 label；查不到就原样返回。
export function agentCategoryLabel(value?: string | null) {
  if (!value) return "";
  return agentCategories.find((c) => c.value === value)?.label ?? value;
}
