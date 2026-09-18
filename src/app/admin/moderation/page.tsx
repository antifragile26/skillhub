"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseErrorMessage } from "@/lib/batch2";
import { automatedReviewLabel } from "@/lib/moderation";
import { supabase } from "@/lib/supabase";

type QueueItem = { target_type: "post" | "comment"; target_id: string; post_id: number; title: string; author: string; content: string; risk_score: number; labels: string[]; created_at: string };

export default function AutomatedModerationPage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const roleResult = await supabase.rpc("current_user_role");
    setRole((roleResult.data as string | null) ?? "member");
    if (roleResult.error || !["operator", "admin"].includes(String(roleResult.data))) return;
    const result = await supabase.rpc("get_automated_moderation_queue", { p_limit: 100 });
    if (result.error) setMessage(getSupabaseErrorMessage(result.error.message));
    else setItems((result.data ?? []) as QueueItem[]);
  }

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);

  async function decide(item: QueueItem, decision: "approve" | "reject") {
    const reason = decision === "approve" ? "人工复核后通过" : window.prompt("请输入下架/驳回原因") ?? "";
    if (decision === "reject" && !reason.trim()) return;
    setBusy(item.target_id);
    const result = item.target_type === "post"
      ? await supabase.rpc("moderate_post", { p_post_id: item.target_id, p_decision: decision === "approve" ? "approve" : "reject", p_reason: reason })
      : await supabase.rpc("moderate_comment", { p_comment_id: item.target_id, p_decision: decision === "approve" ? "restore" : "unpublish", p_reason: reason });
    setMessage(result.error ? getSupabaseErrorMessage(result.error.message) : "自动审核结果已完成人工确认。");
    setBusy(null);
    if (!result.error) void load();
  }

  if (role === null) return <main className="min-h-screen p-8">正在检查权限...</main>;
  if (!["operator", "admin"].includes(role)) return <main className="min-h-screen p-8"><Link href="/forum" className="text-blue-600">← 返回论坛</Link><h1 className="mt-8 text-2xl font-bold">没有后台权限</h1></main>;
  return <main className="min-h-screen bg-white px-5 py-8 text-zinc-900 dark:bg-[#0a0e14] dark:text-zinc-100 sm:px-8"><div className="mx-auto max-w-4xl"><Link href="/admin" className="text-sm text-blue-600">← 返回运营后台</Link><h1 className="mt-4 text-3xl font-bold">自动审核 Agent 队列</h1><p className="mt-2 text-sm text-zinc-500">规则 Agent 只做初筛；每条 flagged 内容仍需人工确认。</p>{message && <p role="alert" className="mt-5 rounded bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}<div className="mt-8 space-y-4">{items.length === 0 ? <p className="text-sm text-zinc-500">暂无待人工复核内容。</p> : items.map((item) => <article key={`${item.target_type}-${item.target_id}`} className="rounded-lg border border-red-200 bg-red-50/40 p-5 dark:border-red-900/50 dark:bg-red-950/20"><div className="flex flex-wrap items-center gap-2"><span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">{item.target_type === "post" ? "帖子" : "回复"}</span><span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">风险分 {item.risk_score}</span><span className="text-sm text-zinc-500">{item.author || "社区用户"}</span></div><h2 className="mt-3 font-semibold">{item.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm">{item.content}</p><p className="mt-3 text-xs text-red-700">命中规则：{item.labels.map(automatedReviewLabel).join("、")}</p><div className="mt-4 flex gap-2"><button type="button" disabled={busy === item.target_id} onClick={() => void decide(item, "approve")} className="rounded bg-green-600 px-3 py-1.5 text-sm text-white">确认通过</button><button type="button" disabled={busy === item.target_id} onClick={() => void decide(item, "reject")} className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-600">确认驳回/下架</button></div></article>)}</div></div></main>;
}
