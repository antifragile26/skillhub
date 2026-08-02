// 给单篇帖子生成 embedding 并写回数据库。发帖成功后由前端调用。
// 服务端运行，使用 service_role key 与 OpenAI key（都在服务器 .env.local）。
import { createAdminClient } from "@/lib/supabaseAdmin";
import { generateEmbedding, buildPostText } from "@/lib/embedding";

export async function POST(request: Request) {
  try {
    const { postId } = (await request.json()) as { postId?: string | number };
    if (postId === undefined || postId === null || postId === "") {
      return Response.json({ error: "缺少 postId" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 取帖子内容
    const { data: post, error: fetchError } = await admin
      .from("posts")
      .select("id, title, content")
      .eq("id", postId)
      .single();
    if (fetchError || !post) {
      return Response.json({ error: `找不到帖子：${fetchError?.message ?? "无数据"}` }, { status: 404 });
    }

    // 生成向量并写回
    const embedding = await generateEmbedding(buildPostText(post.title, post.content));
    const { error: updateError } = await admin
      .from("posts")
      .update({ embedding })
      .eq("id", post.id);
    if (updateError) {
      return Response.json({ error: `写入向量失败：${updateError.message}` }, { status: 500 });
    }

    return Response.json({ ok: true, postId: post.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    return Response.json({ error: message }, { status: 500 });
  }
}
