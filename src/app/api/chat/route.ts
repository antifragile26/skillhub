import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 2_000;
const MAX_TOTAL_CHARS = 8_000;

const assistantInstructions = `你是 SkillHub 的 AI 助手，服务于 Agent 使用者和开发者。请用友好、清晰、实用的方式帮助用户。

【你可以帮助用户】
- 解释 SkillHub 的 Skills、Agents、论坛、知识库和专题等功能。
- 整理用户提供的技能经验、问题、案例或课程素材。
- 协助设计 Agent 案例结构、润色帖子、改进提示词。
- 提供通用的 Agent 实践建议。

【知识边界】
- 你不能查看 SkillHub 当前页面、帖子、用户资料或知识库，也不能代替用户发布、收藏、审核或修改站内内容。
- 不要声称已经查看站内数据或执行了站内操作。
- 遇到具体帖子、账号状态或实时站内数据问题时，说明你无法直接查看，并建议用户去相应页面确认。
- 对不确定的产品规则，不要猜测；简短说明不确定之处。

【回答格式】
- 默认使用中文；用户使用其他语言时，跟随用户的语言。
- 先直接回答问题，再补充必要说明。
- 简单问题用一两段话回答，不要强行加标题或列表。
- 多个并列事项用项目符号；操作步骤用编号；需要比较时再用表格。
- 使用标准 Markdown，标题和列表保持简洁；避免多层嵌套、重复总结和过度加粗。
- 用户要求撰写文案、提示词或模板时，优先给出可直接复制使用的成品，少写前言。
- 用户要求特定格式时，优先遵循用户指定的格式。

【安全与隐私】
- 不索要、不复述密码、API 密钥、令牌等敏感信息。
- 提醒用户不要把密钥或密码发到聊天中。`;

function jsonNoStore(body: Record<string, string>, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonNoStore({ error: "登录服务暂不可用。" }, 503);
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (values) => values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    });
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return jsonNoStore({ error: "请先登录后使用 AI 助手。" }, 401);

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 20_000) return jsonNoStore({ error: "消息内容过长，请缩短后重试。" }, 413);

    let payload: { messages?: unknown };
    try {
      payload = (await request.json()) as { messages?: unknown };
    } catch {
      return jsonNoStore({ error: "请求格式无效。" }, 400);
    }

    if (!Array.isArray(payload.messages) || payload.messages.length === 0 || payload.messages.length > MAX_MESSAGES) {
      return jsonNoStore({ error: "对话内容无效，请新开一轮对话后重试。" }, 400);
    }

    const messages: ChatMessage[] = [];
    let totalChars = 0;
    for (const item of payload.messages) {
      if (!item || typeof item !== "object") return jsonNoStore({ error: "消息格式无效。" }, 400);
      const message = item as { role?: unknown; content?: unknown };
      if ((message.role !== "user" && message.role !== "assistant") || typeof message.content !== "string") {
        return jsonNoStore({ error: "消息格式无效。" }, 400);
      }
      const content = message.content.trim();
      if (!content || content.length > MAX_MESSAGE_CHARS) {
        return jsonNoStore({ error: "单条消息不能为空或超过 2000 字。" }, 400);
      }
      totalChars += content.length;
      if (totalChars > MAX_TOTAL_CHARS) return jsonNoStore({ error: "这轮对话太长，请新开一轮对话。" }, 413);
      messages.push({ role: message.role, content });
    }

    if (messages[messages.length - 1]?.role !== "user") {
      return jsonNoStore({ error: "请先输入一条新消息。" }, 400);
    }

    const model = process.env.OPENAI_CHAT_MODEL;
    const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    const providerHost = new URL(baseUrl).hostname;
    const isDeepSeek = providerHost === "api.deepseek.com";
    const apiKey = isDeepSeek
      ? process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY
      : process.env.OPENAI_API_KEY;
    if (!apiKey || !model) return jsonNoStore({ error: "AI 助手尚未配置模型服务，请联系管理员。" }, 503);

    const tokenLimit = isDeepSeek ? { max_tokens: 700 } : { max_completion_tokens: 700 };
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: assistantInstructions }, ...messages],
        ...tokenLimit,
        stream: false,
      }),
      signal: AbortSignal.timeout(45_000),
      cache: "no-store",
    });

    if (!upstream.ok) {
      console.error("SkillHub chat provider returned status", upstream.status);
      return jsonNoStore({ error: "AI 服务暂时不可用，请稍后重试。" }, 502);
    }

    const result = (await upstream.json()) as { choices?: Array<{ message?: { content?: unknown } }> };
    const reply = result.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      return jsonNoStore({ error: "AI 服务暂时没有返回内容，请稍后重试。" }, 502);
    }

    return jsonNoStore({ reply: reply.trim() });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return jsonNoStore({ error: "助手思考超时了，请稍后再试。" }, 504);
    }
    console.error("SkillHub chat request failed", error instanceof Error ? error.name : "unknown error");
    return jsonNoStore({ error: "暂时无法连接 AI 服务，请稍后重试。" }, 502);
  }
}
