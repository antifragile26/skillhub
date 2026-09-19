import { supabase } from "@/lib/supabase";
import AgentsBrowser from "@/components/AgentsBrowser";
import Link from "next/link";

// 每 15 秒重新从数据库读一次（而不是每次访问都读），兼顾新内容可见性和速度
export const revalidate = 15;

export default async function AgentsPage() {
  // 去数据库读所有 agent
  const { data: agents } = await supabase.from("agents").select("*").limit(60);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0e14] text-zinc-900 dark:text-zinc-100">
      <section className="max-w-6xl mx-auto px-8 py-10">
        {/* 标题行 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Agent 目录</h1>
          <Link href="/agents/new" className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500">创建我的 Agent</Link>
        </div>

        <AgentsBrowser agents={agents ?? []} />
      </section>
    </div>
  );
}
