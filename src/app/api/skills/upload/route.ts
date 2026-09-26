import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  inspectSkillPackage,
  MAX_SKILL_PACKAGE_BYTES,
  sanitizeSkillPackageName,
} from "@/lib/skillPackage";

export const runtime = "nodejs";

function response(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_SKILL_PACKAGE_BYTES + 100_000) {
      return response({ error: "技能包不能超过 10 MB。" }, 413);
    }

    const formData = await request.formData();
    const file = formData.get("package");
    if (!(file instanceof File) || file.size === 0) {
      return response({ error: "请选择一个非空 ZIP 技能包。" }, 400);
    }
    if (!file.name.toLowerCase().endsWith(".zip")) {
      return response({ error: "为确保可安全校验，目前只支持 .zip 格式的技能包。" }, 400);
    }
    const manifest = inspectSkillPackage(await file.arrayBuffer());

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return response({ error: "上传服务尚未配置。" }, 503);

    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (values) => values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    });
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return response({ error: "请先登录后再上传。" }, 401);

    const filePath = `${auth.user.id}/${crypto.randomUUID()}-${sanitizeSkillPackageName(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from("skill-packages")
      .upload(filePath, file, { upsert: false, contentType: "application/zip" });
    if (uploadError) return response({ error: `文件上传失败：${uploadError.message}` }, 400);

    return response({
      filePath,
      storageBucket: "skill-packages",
      packageName: sanitizeSkillPackageName(file.name),
      packageSize: file.size,
      manifest,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "技能包校验失败。";
    return response({ error: message }, 400);
  }
}
