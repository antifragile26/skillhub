// 调 OpenAI（或兼容网关）生成文本 embedding。仅服务端使用。
// OPENAI_BASE_URL 可配：国内服务器直连 api.openai.com 会超时，
// 用一个 OpenAI 兼容的中转网关地址即可。默认官方地址。

const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 维，需与 SQL 里的 vector(1536) 一致

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("缺少 OPENAI_API_KEY 环境变量");
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");

  const res = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    // 截断超长文本，embedding 模型有 token 上限
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text.slice(0, 8000) }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenAI embedding 请求失败 (${res.status}): ${detail}`);
  }

  const json = (await res.json()) as { data: { embedding: number[] }[] };
  const embedding = json.data?.[0]?.embedding;
  if (!embedding) throw new Error("OpenAI 返回结果里没有 embedding");
  return embedding;
}

// 把帖子标题+正文拼成用于生成向量的文本
export function buildPostText(title: string, content?: string | null): string {
  return [title, content ?? ""].filter(Boolean).join("\n\n");
}
