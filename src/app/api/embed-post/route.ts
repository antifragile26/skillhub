import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { generateEmbedding, buildPostText } from "@/lib/embedding";

export async function POST(request: Request) {
  try {
    const { postId } = (await request.json()) as { postId?: string | number };
    if (postId === undefined || postId === null || postId === "") return Response.json({ error: "缺少 postId" }, { status: 400 });
    const cookieStore = await cookies();
    const sessionClient = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => cookieStore.getAll(), setAll: (values) => values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } });
    const { data: auth } = await sessionClient.auth.getUser();
    if (!auth.user) return Response.json({ error: "未授权" }, { status: 401 });
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.OPENAI_API_KEY) return Response.json({ error: "向量后台任务未配置，发帖不受影响" }, { status: 503 });
    const admin = createAdminClient();
    const { data: post, error: fetchError } = await admin.from("posts").select("id, title, content, user_id").eq("id", postId).eq("user_id", auth.user.id).single();
    if (fetchError || !post) return Response.json({ error: "帖子不存在或无权处理" }, { status: 404 });
    const embedding = await generateEmbedding(buildPostText(post.title, post.content));
    const { error: updateError } = await admin.from("posts").update({ embedding }).eq("id", post.id).eq("user_id", auth.user.id);
    if (updateError) return Response.json({ error: `写入向量失败：${updateError.message}` }, { status: 500 });
    return Response.json({ ok: true, postId: post.id });
  } catch (err) { return Response.json({ error: err instanceof Error ? err.message : "未知错误" }, { status: 500 }); }
}
