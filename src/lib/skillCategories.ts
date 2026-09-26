export const skillCategoryDefinitions = [
  { value: "software-ai", label: "软件与人工智能", keywords: ["人工智能", "ai", "agent", "llm", "model", "claude", "openai", "prompt", "数据科学", "软件开发", "云计算", "网络安全", "物联网", "区块链", "量子计算", "量子计算框架", "量子计算硬件集成", "编程语言理论", "类型理论", "编程语言语义", "程序验证", "代码搜索工具", "software", "code", "coding", "cloud", "devops", "database", "sql", "python", "javascript", "git", "github", "docker", "kubernetes", "security", "api"] },
  { value: "product-design", label: "产品与设计", keywords: ["产品设计", "产品管理", "平面设计", "三维与游戏", "生成式艺术算法", "图像增强", "用户体验", "product", "design", "ux", "ui", "3d", "game"] },
  { value: "business-finance", label: "商业与金融", keywords: ["量化金融", "证券投资", "金融科技", "电商运营", "营销增长", "运营管理", "财务会计", "家庭财务管理", "家庭理财", "零售运营规划", "定价策略", "销售方法论", "商业", "finance", "fintech", "marketing", "sales", "retail", "accounting", "ecommerce"] },
  { value: "content-media", label: "内容创作与媒体", keywords: ["短视频", "影视制作", "音乐音频", "语言服务", "技术文档写作", "写作评估", "写作修订", "写作辅助", "写作工具", "写作诊断", "写作", "写作技能", "写作编辑工具", "叙事算法", "生成式艺术", "内容创作", "writing", "video", "film", "music", "audio", "translation", "content"] },
  { value: "research-education", label: "科研与教育", keywords: ["科研学术", "生物医药", "教育培训", "数学", "数值计算", "生物信息学", "论证验证", "哲学思维", "合成与类比", "方法论", "research", "science", "education", "math", "biology", "medical", "academic"] },
  { value: "office-collaboration", label: "企业办公与协作", keywords: ["办公软件", "企业内部通讯", "内部通信", "会议管理", "会议准备", "沟通技能", "人力资源", "日历管理", "自动化工具", "桌面操作", "桌面应用", "工具管理", "支持升级", "办公", "协作", "communication", "meeting", "calendar", "hr", "automation", "office", "desktop"] },
  { value: "industry-services", label: "行业专业服务", keywords: ["法律合规", "餐饮管理", "房地产", "能源环保", "物流供应链", "建筑工程", "工业制造", "旅游酒店", "交通出行", "咨询顾问", "医疗健康", "公共服务", "航空航天工程", "行业", "法律", "legal", "logistics", "construction", "manufacturing", "travel", "transport", "consulting", "health"] },
  { value: "life-development", label: "生活与个人发展", keywords: ["宠物护理", "宠物护理工具", "婚礼预算管理", "婚礼规划", "生活服务", "娱乐休闲", "职业发展", "占星术与命理学应用开发", "占卜命理", "命理研究", "个人反思", "家庭", "生活", "career", "lifestyle", "pet", "wedding", "entertainment"] },
  { value: "docs-knowledge", label: "文档与知识管理", keywords: ["知识管理系统", "个人知识管理", "文档处理", "格式转换", "PDF文档处理", "PDF文档转换", "搜索工具", "知识", "文档", "document", "pdf", "docx", "spreadsheet", "knowledge", "search", "memory", "retrieval"] },
  { value: "general-tools", label: "通用工具与方法", keywords: ["无", "未指定", "通用", "通用工具", "思维方法", "general", "unclassified"] },
] as const;

export type SkillCategoryValue = (typeof skillCategoryDefinitions)[number]["value"];

const categoryAliases: Record<SkillCategoryValue, readonly string[]> = {
  "software-ai": [
    "software development", "programming", "code review", "debugging", "bug report", "release notes",
    "readme", "api", "代码", "编程", "软件开发", "调试", "故障排查", "缺陷报告", "版本发布", "开发文档",
  ],
  "product-design": [
    "product management", "product design", "requirements", "user research", "user interview", "acceptance criteria", "acceptance checklist",
    "产品", "需求分析", "需求整理", "需求澄清", "用户研究", "用户访谈", "验收", "原型", "产品复盘",
  ],
  "business-finance": [
    "business plan", "pricing", "revenue", "budget", "商业计划", "经营分析", "定价", "财务分析", "预算",
  ],
  "content-media": [
    "article", "editing", "copywriting", "content creation", "文章", "写作", "编辑", "文案", "内容创作", "媒体",
  ],
  "research-education": [
    "research brief", "source comparison", "learning plan", "self test", "quiz", "study", "academic research",
    "研究简报", "资料研究", "资料对比", "来源对比", "学习计划", "学习", "自测", "测验", "课程", "科研",
  ],
  "office-collaboration": [
    "work email", "meeting minutes", "weekly report", "project handover", "presentation", "team collaboration", "retrospective",
    "工作邮件", "邮件", "会议纪要", "行动项", "周报", "项目交接", "交接", "汇报", "演示文稿", "团队协作", "项目复盘",
  ],
  "industry-services": [
    "legal services", "healthcare", "logistics", "construction", "manufacturing", "医疗健康", "法律服务", "物流", "建筑工程", "制造业",
  ],
  "life-development": [
    "career planning", "personal development", "personal reflection", "职业规划", "个人成长", "个人反思",
  ],
  "docs-knowledge": [
    "long form reader", "long-form-reader", "reading notes", "knowledge management", "document processing", "technical documentation",
    "阅读笔记", "长文阅读", "长文摘要", "知识整理", "知识管理", "文档处理", "技术文档", "说明文档", "readme",
  ],
  "general-tools": ["general purpose", "通用用途"],
};

function keywordMatches(value: string, keyword: string) {
  const normalized = value.toLowerCase();
  const query = keyword.toLowerCase().trim();
  if (!query) return false;

  // Chinese phrases are matched as phrases; English words are matched as tokens
  // so short strings such as "ai" do not match inside unrelated words.
  if (/[\u3400-\u9fff]/.test(query)) {
    return normalized.replace(/[\s\p{P}\p{S}]/gu, "").includes(query.replace(/[\s\p{P}\p{S}]/gu, ""));
  }

  const tokens = new Set(normalized.match(/[a-z0-9+#.]+/g) ?? []);
  const queryTokens = query.match(/[a-z0-9+#.]+/g) ?? [];
  return queryTokens.length > 0 && queryTokens.every((token) => tokens.has(token));
}

function categoryScore(value: string, keywords: readonly string[], weight: number) {
  if (!value.trim()) return 0;
  return new Set(keywords.filter((keyword) => keywordMatches(value, keyword))).size * weight;
}

export function isSkillCategory(value?: string | null): value is SkillCategoryValue {
  return skillCategoryDefinitions.some((category) => category.value === value);
}

export function skillCategoryLabel(value?: string | null) {
  return skillCategoryDefinitions.find((category) => category.value === value)?.label ?? "通用工具与方法";
}

export function recommendSkillCategory(name: string, description: string, tags: string[] = []): SkillCategoryValue {
  const evidence = [
    { value: name, weight: 5 },
    { value: description, weight: 2 },
    { value: tags.join(" "), weight: 7 },
  ];
  let selected: SkillCategoryValue = "general-tools";
  let highestScore = 0;
  for (const category of skillCategoryDefinitions) {
    const keywords = [...category.keywords, ...categoryAliases[category.value]];
    const score = evidence.reduce((total, source) => total + categoryScore(source.value, keywords, source.weight), 0);
    if (score > highestScore) {
      selected = category.value;
      highestScore = score;
    }
  }
  return selected;
}
