import { supabase } from "@/lib/supabase";
import SkillsBrowser from "@/components/SkillsBrowser";
import Link from "next/link";

// 每 15 秒重新从数据库读一次（而不是每次访问都读），兼顾新内容可见性和速度
export const revalidate = 15;

export default async function SkillsPage() {
  const { data: skills } = await supabase
    .from("skills")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(60);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0e14] text-zinc-900 dark:text-zinc-100">
      <section className="max-w-6xl mx-auto px-8 py-10">
        {/* 标题行（与 Agent 页一致：左标题 + 右侧发布按钮） */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Skill 目录</h1>
          <Link href="/publish" className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500">发布我的 Skill</Link>
        </div>

        <SkillsBrowser skills={skills ?? []} />
      </section>
    </div>
  );
}
