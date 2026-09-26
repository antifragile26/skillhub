"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Skill = {
  id: number;
  name: string;
  version: string | null;
  description: string | null;
  status: "draft" | "pending" | "published" | "rejected" | "unpublished";
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

const statusStyle: Record<Skill["status"], string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
  published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200",
  unpublished: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
};
const statusLabel: Record<Skill["status"], string> = { draft: "草稿", pending: "审核中", published: "已发布", rejected: "已驳回", unpublished: "已下架" };

export default function MySkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { window.location.assign("/login?returnTo=%2Fmy-skills"); return; }
    const { data, error } = await supabase.from("skills").select("id,name,version,description,status,rejection_reason,created_at,updated_at").eq("user_id", auth.user.id).order("updated_at", { ascending: false });
    setSkills((data ?? []) as Skill[]);
    setMessage(error ? `内容加载失败：${error.message}` : "");
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function resubmit(id: number) {
    const { error } = await supabase.rpc("submit_skill_for_review", { p_skill_id: id });
    setMessage(error ? `提交失败：${error.message}` : "已提交审核。");
    if (!error) await load();
  }

  async function removeDraft(id: number) {
    if (!confirm("删除这份未发布的 Skill 草稿？文件包也会从私有存储移除。")) return;
    const { error } = await supabase.from("skills").delete().eq("id", id);
    setMessage(error ? `删除失败：${error.message}` : "草稿已删除。注意：孤立文件会由管理员定期清理。");
    if (!error) await load();
  }

  return <main className="min-h-screen bg-white px-5 py-10 text-zinc-900 dark:bg-[#0a0e14] dark:text-zinc-100 sm:px-8"><div className="mx-auto max-w-5xl"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-zinc-500">创作者中心</p><h1 className="mt-1 text-3xl font-bold">我发布的 Skills</h1></div><Link href="/publish" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">发布新 Skill</Link></div>{message && <p className="mt-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">{message}</p>}<div className="mt-8 grid gap-4">{loading ? <p className="text-sm text-zinc-500">正在加载…</p> : skills.length === 0 ? <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700">还没有发布 Skill。<Link href="/publish" className="ml-1 text-blue-600 hover:underline dark:text-blue-400">现在上传</Link></div> : skills.map((skill) => <article key={skill.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-slate-900/40"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/skills/${skill.id}`} className="font-mono text-lg font-semibold hover:text-blue-600 dark:hover:text-blue-300">{skill.name}</Link><p className="mt-1 text-sm text-zinc-500">v{skill.version || "0.1.0"} · 更新于 {new Date(skill.updated_at).toLocaleDateString("zh-CN")}</p></div><span className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle[skill.status]}`}>{statusLabel[skill.status]}</span></div><p className="mt-3 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">{skill.description}</p>{skill.rejection_reason && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200">驳回原因：{skill.rejection_reason}</p>}<div className="mt-4 flex flex-wrap gap-3">{(skill.status === "draft" || skill.status === "rejected") && <><button type="button" onClick={() => void resubmit(skill.id)} className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/30">提交审核</button><button type="button" onClick={() => void removeDraft(skill.id)} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30">删除草稿</button></>}{skill.status === "pending" && <span className="text-sm text-zinc-500">审核中，暂不可修改。</span>}{skill.status === "published" && <span className="text-sm text-zinc-500">已发布版本保持稳定；新版编辑入口将在版本历史模块中提供。</span>}</div></article>)}</div></div></main>;
}
