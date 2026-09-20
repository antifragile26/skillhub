import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 2_000;
const MAX_TOTAL_CHARS = 8_000;

const assistantInstructions = `你是 SkillHub 的 AI 聊天助手。SkillHub 是面向 Agent 使用者和开发者的技能交流社区，包含 Skills、Agents、论坛、知识库和专题等入口。
你可以帮助用户了解这些功能，整理技能经验、设计 Agent 案例结构、润色提问或总结一般性的实践方法。回答使用简洁、友好的中文；用户使用其他语言时跟随用户语言。
你不能访问或检索 SkillHub 当前页面、帖子、用户资料或知识库，也不能执行发布、收藏、审核等站内操作。不要声称已查看站内内容或执行了操作；遇到具体帖子、账号状态或实时站内数据问题时，说明当前能力限制并建议用户到相应页面查看。
如果不知道某项具体产品规则，不要编造，明确说明不确定。提醒用户不要分享密码、API 密钥或其他敏感信息。`;

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
