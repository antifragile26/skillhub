// 这个文件负责"连接 Supabase 数据库"。
// 它拿着 .env.local 里的地址和钥匙，创建一个通道（叫 supabase）。
// 以后项目里想存数据、读数据、做登录，都用这个 supabase。

import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,      // 地址（从 .env.local 读）
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // 钥匙（从 .env.local 读）
);
