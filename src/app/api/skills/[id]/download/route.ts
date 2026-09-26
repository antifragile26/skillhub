import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function safeDownloadName(value: string | null, id: number) {
  const name = value?.trim().replace(/[\r\n"\\/]/g, "_");
  return name || `skill-${id}.zip`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isSafeInteger(id) || id <= 0) return errorResponse("Skill ID 无效。", 400);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return errorResponse("下载服务尚未配置。", 503);

    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (values) => values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    });
    const { data: skill, error: skillError } = await supabase
      .from("skills")
      .select("id,status,storage_bucket,file_path,package_name")
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle();
    if (skillError) return errorResponse("无法读取 Skill 信息。", 500);
    if (!skill) return errorResponse("Skill 不存在或尚未发布。", 404);
    if (!skill.file_path) return errorResponse("该 Skill 没有可下载的技能包。", 404);

    const bucket = skill.storage_bucket || "packages";
    const { data: file, error: downloadError } = await supabase.storage.from(bucket).download(skill.file_path);
    if (downloadError || !file) return errorResponse("技能包文件不存在或暂时不可用。", 404);

    // 下载由本站代理完成，避免浏览器直接请求私有 Storage 时受跨域或会话影响。
    void supabase.rpc("increment_skill_downloads", { skill_id: id });
    const filename = safeDownloadName(skill.package_name, id);
    const fallbackName = filename.replace(/[^\x20-\x7E]/g, "_");
    const body = await file.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "application/zip",
        "Content-Length": String(body.byteLength),
        "Content-Disposition": `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "下载失败，请稍后重试。", 500);
  }
}
