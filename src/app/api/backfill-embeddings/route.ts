// 给所有还没有向量的老帖批量补 embedding。手动触发一次即可。
// 需要密钥保护：请求头带 x-admin-secret，值等于服务器环境变量 BACKFILL_SECRET。
import { createAdminClient } from "@/lib/supabaseAdmin";
import { generateEmbedding, buildPostText } from "@/lib/embedding";

export async function POST(request: Request) {
  const secret = process.env.BACKFILL_SECRET;
  if (!secret || request.headers.get("x-admin-secret") !== secret) {
    return Response.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data: posts, error } = await admin
      .from("posts")
      .select("id, title, content")
      .is("embedding", null)
      .limit(100);
    if (error) {
      return Response.json({ error: `查询失败：${error.message}` }, { status: 500 });
    }
    if (!posts || posts.length === 0) {
      return Response.json({ ok: true, processed: 0, message: "没有待补向量的帖子" });
    }

    const results: { id: number | string; ok: boolean; error?: string }[] = [];
    // 串行处理，避免打爆 API 限流
    for (const post of posts) {
      try {
        const embedding = await generateEmbedding(buildPostText(post.title, post.content));
        const { error: updateError } = await admin.from("posts").update({ embedding }).eq("id", post.id);
        results.push({ id: post.id, ok: !updateError, error: updateError?.message });
      } catch (err) {
        results.push({ id: post.id, ok: false, error: err instanceof Error ? err.message : "未知错误" });
      }
    }

    const succeeded = results.filter((r) => r.ok).length;
    return Response.json({ ok: true, processed: results.length, succeeded, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    return Response.json({ error: message }, { status: 500 });
  }
}
