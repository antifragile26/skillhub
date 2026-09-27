export const knowledgeCategories = [
  "Skill 使用与排错",
  "Skill 开发与发布",
  "阅读与学习",
  "资料与研究",
  "写作与表达",
  "沟通与协作",
  "产品与需求",
  "项目与交付",
  "其他",
] as const;

export type KnowledgeCategory = (typeof knowledgeCategories)[number];

export function isKnowledgeCategory(value: unknown): value is KnowledgeCategory {
  return typeof value === "string" && knowledgeCategories.some((category) => category === value);
}
