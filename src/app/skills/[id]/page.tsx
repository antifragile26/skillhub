"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SkillDetail from "./SkillDetail";
import { useEffect, useState } from "react";

type Skill = {
  id: string | number;
  name: string;
  category?: string | null;
  version?: string | null;
  description?: string | null;
  downloads?: number | null;
  tags?: string[] | null;
  created_at?: string | null;
  user_id?: string | null;
};

type CurrentUser = {
  id: string;
};

export default function SkillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [skill, setSkill] = useState<Skill | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [skillResult, userResult] = await Promise.all([
        supabase.from("skills").select("*").eq("id", id).is("deleted_at", null).single(),
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
    return <main className="hub-page"><div className="hub-container py-12 hub-muted">正在加载作品…</div></main>;
  }

  if (!skill) {
    return <main className="hub-page"><div className="hub-container py-12"><p>未找到该 Skill。</p><Link className="mt-4 inline-flex text-sm text-[var(--accent-strong)]" href="/skills">← 返回 Skills</Link></div></main>;
  }

  return (
    <main className="hub-page">
      <section className="hub-container py-8 sm:py-10">
        <div className="flex items-center justify-between">
          <Link href="/skills" className="text-sm hub-muted hover:text-[var(--accent-strong)]">← 返回 Skills</Link>
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
    </main>
  );
}
