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
  { value: "general-tools", label: "通用工具与方法", keywords: ["无", "未指定", "通用", "技能", "工具应用", "工具使用分析", "技能管理", "工具软件", "系统工具", "工具", "问题解决技能", "技能写作", "通用技能", "思维方法", "general", "tool", "utility", "skill", "workflow", "cli", "terminal", "filesystem", "mcp"] },
] as const;

export type SkillCategoryValue = (typeof skillCategoryDefinitions)[number]["value"];

function categoryScore(value: string, keywords: readonly string[], weight: number) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return 0;
  const tokens = new Set(normalized.split(/[^a-z0-9+#.-]+/).filter(Boolean));
  return keywords.reduce((score, keyword) => score + (tokens.has(keyword) || (keyword.length > 3 && normalized.includes(keyword)) ? weight : 0), 0);
}

export function isSkillCategory(value?: string | null): value is SkillCategoryValue {
  return skillCategoryDefinitions.some((category) => category.value === value);
}

export function skillCategoryLabel(value?: string | null) {
  return skillCategoryDefinitions.find((category) => category.value === value)?.label ?? "通用工具与方法";
}

export function recommendSkillCategory(name: string, description: string, tags: string[] = []): SkillCategoryValue {
  let selected: SkillCategoryValue = "general-tools";
  let highestScore = 0;
  for (const category of skillCategoryDefinitions) {
    const score = categoryScore(name, category.keywords, 2)
      + categoryScore(description, category.keywords, 1)
      + tags.reduce((total, tag) => total + categoryScore(tag, category.keywords, 4), 0);
    if (score > highestScore) {
      selected = category.value;
      highestScore = score;
    }
  }
  return selected;
}
