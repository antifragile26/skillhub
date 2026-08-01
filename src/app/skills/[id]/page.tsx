"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import CreateMenu from "@/components/CreateMenu";
import ThemeToggle from "@/components/ThemeToggle";
import AuthControls from "@/components/AuthControls";
import SkillDetail from "./SkillDetail";
import { useEffect, useState } from "react";

type Skill = {
  id: string | number;
  name: string;
  version?: string | null;
  description?: string | null;
  downloads?: number | null;
  tags?: string[] | null;
  created_at?: string | null;
  user_id?: string | null;
};

export default function SkillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [skill, setSkill] = useState<Skill | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [skillResult, userResult] = await Promise.all([
        supabase.from("skills").select("*").eq("id", id).single(),
        supabase.auth.getUser(),
      ]);
      setSkill(skillResult.data);
      setUser(userResult.data.user);
      setIsLoading(false);
    }
    load();
  }, [id]);

  async function handleDelete() {
    if (!skill || !user || skill.user_id !== user.id) return;
    if (!confirm("确定要删除这个 Skill 吗？删除后无法恢复。")) return;

    const { error } = await supabase.from("skills").delete().eq("id", skill.id);
    if (error) {
      alert(`删除失败：${error.message}`);
      return;
    }
    router.push("/skills");
  }

  if (isLoading) {
    return <div className="min-h-screen bg-white dark:bg-[#0a0e14] text-zinc-900 dark:text-zinc-100 p-8">加载中...</div>;
  }

  if (!skill) {
    return <div className="min-h-screen bg-white dark:bg-[#0a0e14] text-zinc-900 dark:text-zinc-100 p-8">未找到该 Skill。</div>;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0e14] text-zinc-900 dark:text-zinc-100">
      <header className="flex items-center gap-6 px-8 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <Link href="/" className="text-2xl font-bold text-blue-500 dark:text-blue-400">SkillHub</Link>
        <nav className="ml-auto flex items-center gap-5 text-sm text-zinc-600 dark:text-zinc-300">
          <Link href="/skills" className="hover:text-zinc-900 dark:hover:text-white">Skills</Link>
          <Link href="/agents" className="hover:text-zinc-900 dark:hover:text-white">Agents</Link>
          <Link href="/forum" className="hover:text-zinc-900 dark:hover:text-white">论坛</Link>
          <CreateMenu />
          <ThemeToggle />
          <AuthControls />
        </nav>
      </header>

      <section className="max-w-6xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between">
          <Link href="/skills" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white">← 返回 Skills</Link>
          {user && skill.user_id === user.id && (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
            >
              删除
            </button>
          )}
        </div>
        <div className="mt-6">
          <SkillDetail skill={skill} />
        </div>
      </section>
    </div>
  );
}
