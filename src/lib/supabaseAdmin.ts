// 服务端专用 Supabase 客户端，使用 service_role key（绕过 RLS，权限最高）。
// 绝不能在浏览器/客户端组件里 import 这个文件——key 会泄漏。
// 只在 API route（route.ts）等服务端代码里用。
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 环境变量");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
