"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Skill = { id: number; name: string; version: string | null; description: string | null; user_id: string | null; created_at: string; package_name: string | null; package_size: number | null; platforms: string[] | null; tags: string[] | null };

export default function SkillModerationPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { window.location.assign("/login?returnTo=%2Fadmin%2Fskills"); return; }
    const operator = await supabase.rpc("current_user_is_operator");
    if (operator.error || !operator.data) { setAllowed(false); setLoading(false); return; }
    setAllowed(true);
    const { data, error } = await supabase.from("skills").select("id,name,version,description,user_id,created_at,package_name,package_size,platforms,tags").eq("status", "pending").order("submitted_at", { ascending: true });
    setSkills((data ?? []) as Skill[]);
    setMessage(error ? `待审核列表加载失败：${error.message}` : "");
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function moderate(skill: Skill, decision: "approve" | "reject") {
    const reason = decision === "reject" ? prompt("请填写驳回原因（会通知作者）：") : null;
    if (decision === "reject" && !reason?.trim()) return;
    const { error } = await supabase.rpc("moderate_skill", { p_skill_id: skill.id, p_decision: decision, p_reason: reason });
    setMessage(error ? `操作失败：${error.message}` : decision === "approve" ? `已发布「${skill.name}」。` : `已驳回「${skill.name}」。`);
    if (!error) await load();
  }

  if (loading) return <main className="min-h-screen bg-white p-10 text-zinc-500 dark:bg-[#0a0e14]">正在核验后台权限…</main>;
  if (!allowed) return <main className="min-h-screen bg-white p-10 dark:bg-[#0a0e14]"><Link href="/forum" className="text-sm text-blue-600 hover:underline">← 返回论坛</Link><h1 className="mt-6 text-2xl font-bold">没有后台权限</h1><p className="mt-2 text-zinc-500">需要运营或管理员角色才能审核 Skill。</p></main>;
  return <main className="min-h-screen bg-white px-5 py-10 text-zinc-900 dark:bg-[#0a0e14] dark:text-zinc-100 sm:px-8"><div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-zinc-500">运营后台</p><h1 className="mt-1 text-3xl font-bold">Skill 审核</h1></div><Link href="/admin" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">返回运营后台</Link></div><p className="mt-3 text-sm text-zinc-500">审核前请检查 SKILL.md、说明、来源与安全风险；文件包未经发布不会公开下载。</p>{message && <p className="mt-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">{message}</p>}<div className="mt-8 grid gap-4">{skills.length === 0 ? <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700">目前没有待审核的 Skill。</div> : skills.map((skill) => <article key={skill.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-slate-900/40"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-mono text-lg font-semibold">{skill.name}</h2><p className="mt-1 text-sm text-zinc-500">v{skill.version || "0.1.0"} · 提交于 {new Date(skill.created_at).toLocaleString("zh-CN")}</p></div><Link href={`/skills/${skill.id}`} className="text-sm text-blue-600 hover:underline dark:text-blue-400">预览详情</Link></div><p className="mt-3 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{skill.description}</p><div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500">{skill.package_name && <span>文件：{skill.package_name}</span>}{skill.package_size && <span>· {(skill.package_size / 1024).toFixed(1)} KB</span>}{(skill.platforms ?? []).map((item) => <span key={item} className="rounded bg-violet-100 px-2 py-1 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">{item}</span>)}</div><div className="mt-5 flex gap-3"><button type="button" onClick={() => void moderate(skill, "approve")} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">通过并发布</button><button type="button" onClick={() => void moderate(skill, "reject")} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30">驳回</button></div></article>)}</div></div></main>;
}
