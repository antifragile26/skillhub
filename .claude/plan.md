# Agent 功能增强计划

## 需求分析

根据用户截图和描述，需要实现：

1. **Agent 创建页面**：添加框架标签（frameworks）的多选功能
   - 一个 agent 可以支持多个框架（如 LangGraph, CrewAI, AutoGen 等）
   - 改为多选复选框，类似 Skill 的标签输入方式

2. **Agent 社区页面**：改进筛选功能
   - 当前：只有框架标签的单选按钮筛选
   - 目标：
     - 添加类别标签（category）筛选，类似论坛的分类
     - 框架标签改为多选复选框（打勾方式），类似 SkillsBrowser 的侧边栏
     - 布局参考 SkillsBrowser：左侧筛选栏 + 右侧列表

## 现有实现分析

### 数据库结构（agents 表）
```sql
agents: id, name, framework, description, skills_count, posts_count, user_id, created_at
```
- `framework` 字段：当前是单个字符串，需要改为数组或支持多个框架
- 需要添加 `category` 字段来存储 agent 类型（研究分析、代码开发等）

### 参考实现

**Skills 的多选标签实现** (SkillsBrowser.tsx):
- `tags` 是数组类型 `string[]`
- 左侧栏：复选框列表，使用 `toggleTag()` 切换
- 筛选逻辑：`(skill.tags ?? []).some((tag) => selectedTags.includes(tag))`

**Forum 的单选分类实现** (ForumBrowser.tsx):
- `category` 是单个字符串
- 使用 `postCategories` 数组定义所有分类
- 按钮切换，单选模式

**当前 Agents 实现** (AgentsBrowser.tsx):
- `framework` 当前是单个字符串
- 使用单选按钮切换框架筛选
- 简单的卡片网格布局

## 实施方案

### 步骤 1：定义常量和类型

创建 `src/lib/agentConstants.ts`：
```typescript
// Agent 框架选项（一个 agent 可支持多个框架）
export const agentFrameworks = [
  "LangGraph",
  "CrewAI", 
  "AutoGen",
  "LangChain",
  "Semantic Kernel",
  "其他"
];

// Agent 类别（单选，类似论坛分类）
export const agentCategories = [
  { value: "research", label: "研究分析" },
  { value: "coding", label: "代码开发" },
  { value: "content", label: "内容创作" },
  { value: "workflow", label: "自动化工作流" },
  { value: "other", label: "其他" },
];

export function agentCategoryLabel(value?: string | null) {
  if (!value) return "";
  return agentCategories.find((c) => c.value === value)?.label ?? value;
}
```

### 步骤 2：数据库 Schema 变更

修改 `agents` 表结构（需要在 Supabase SQL Editor 手动执行）：

```sql
-- 添加 category 字段（类别，单选）
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS category TEXT;

-- 修改 framework 字段为数组类型（支持多个框架）
-- 注意：如果已有数据，需要先迁移
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS frameworks TEXT[];

-- 数据迁移：将旧的 framework 字段迁移到 frameworks 数组
UPDATE public.agents 
SET frameworks = ARRAY[framework]
WHERE framework IS NOT NULL AND frameworks IS NULL;

-- 可选：删除旧的 framework 字段（或保留作为兼容）
-- ALTER TABLE public.agents DROP COLUMN framework;
```

**注意**：根据 memory 记录，这个项目不使用自动迁移，需要让用户手动在 Supabase SQL Editor 执行。

### 步骤 3：更新 Agent 创建表单

修改 `src/app/agents/new/page.tsx`：
- 移除单选下拉框的 `framework`
- 添加 `category` 单选下拉框（使用 agentCategories）
- 添加 `frameworks` 多选输入（文本输入或复选框列表）
- 更新表单提交逻辑

修改 `src/lib/contentPayloads.ts`：
```typescript
type AgentFormValues = {
  name: string;
  category: string;
  frameworks: string; // 逗号或空格分隔的字符串，转为数组
  description: string;
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
```

### 步骤 4：重构 AgentsBrowser 组件

修改 `src/components/AgentsBrowser.tsx`，参考 SkillsBrowser 的布局：

**布局改为左右结构**：
```
┌─────────────────────────────────────┐
│ 搜索框                               │
├─────────┬───────────────────────────┤
│ 类别    │ Agent 卡片网格             │
│ ○ 全部  │                           │
│ ○ 研究  │ [卡片] [卡片] [卡片]       │
│ ○ 开发  │ [卡片] [卡片] [卡片]       │
│         │                           │
│ 框架    │                           │
│ ☑ Lang  │                           │
│ □ Crew  │                           │
│ □ Auto  │                           │
└─────────┴───────────────────────────┘
```

**筛选逻辑**：
- `category`：单选（null 表示全部）
- `selectedFrameworks`：多选数组，空数组表示不筛选
- 匹配条件：
  - category 匹配（或 null）
  - frameworks 有交集（`agent.frameworks.some(f => selectedFrameworks.includes(f))`）
  - 搜索词匹配名称或描述

### 步骤 5：更新类型定义

修改 `AgentsBrowser.tsx` 中的类型：
```typescript
type Agent = {
  id: string | number;
  name: string;
  category?: string | null;
  frameworks?: string[] | null; // 改为数组
  description?: string | null;
  skills_count?: number | null;
  posts_count?: number | null;
};
```

## 文件清单

需要修改/创建的文件：

1. **新建** `src/lib/agentConstants.ts` - 定义框架和类别常量
2. **修改** `src/lib/contentPayloads.ts` - 更新 buildAgentPayload
3. **修改** `src/app/agents/new/page.tsx` - 重构创建表单
4. **修改** `src/components/AgentsBrowser.tsx` - 重构浏览器组件
5. **SQL 脚本** - 提供给用户在 Supabase SQL Editor 执行

## 数据兼容性

**向后兼容策略**：
- 保留旧的 `framework` 字段（不删除），新代码读取 `frameworks` 数组
- 如果 `frameworks` 为空但 `framework` 有值，fallback 到旧字段
- 在组件中处理：`agent.frameworks || (agent.framework ? [agent.framework] : [])`

## 测试要点

1. 创建新 agent 时，多选框架能正确保存为数组
2. 老数据（单个 framework）能正确显示和筛选
3. 类别单选筛选正常工作
4. 框架多选筛选正常工作（选中多个，显示包含任一框架的 agent）
5. 搜索功能与筛选配合正常
6. 空状态正确显示
