"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type AuditLog = { id: number; actor_id: string | null; action: string; target_type: string; target_id: string; before_state: Record<string, unknown> | null; after_state: Record<string, unknown> | null; reason: string | null; created_at: string };

const actionLabels: Record<string, string> = { approve: "审核通过", reject: "驳回", unpublish: "下架", restore: "恢复", resolve_report: "处理举报", feature_post: "精选/置顶", create_knowledge: "创建知识草稿", publish_knowledge: "发布知识" };

export default function AuditPage() {
  const [role, setRole] = useState<string | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const roleResult = await supabase.rpc("current_user_role");
      const nextRole = String(roleResult.data ?? "member");
      setRole(nextRole);
      if (!roleResult.error && ["operator", "admin"].includes(nextRole)) {
        const result = await supabase.from("operation_audit_logs").select("id,actor_id,action,target_type,target_id,before_state,after_state,reason,created_at").order("created_at", { ascending: false }).limit(100);
        if (result.error) setMessage(result.error.message); else setLogs((result.data ?? []) as AuditLog[]);
      }
    }
    void load();
  }, []);

  if (role === null) return <main className="min-h-screen p-8">正在检查后台权限...</main>;
  if (!["operator", "admin"].includes(role)) return <main className="min-h-screen p-8"><Link href="/admin" className="text-blue-600">← 返回运营后台</Link><h1 className="mt-8 text-2xl font-bold">没有后台权限</h1></main>;
  return <main className="min-h-screen bg-white px-5 py-8 text-zinc-900 dark:bg-[#0a0e14] dark:text-zinc-100 sm:px-8"><div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-center justify-between gap-4"><div><Link href="/admin" className="text-sm text-blue-600">← 返回运营后台</Link><h1 className="mt-3 text-3xl font-bold">运营审计日志</h1><p className="mt-1 text-sm text-zinc-500">记录审核、举报、精选置顶、知识发布等关键操作。</p></div><span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">最近 100 条</span></div>{message && <p role="alert" className="mt-5 rounded-md bg-red-50 p-3 text-sm text-red-700">{message}</p>}<div className="mt-8 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800"><table className="min-w-full text-left text-sm"><thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-900"><tr><th className="px-4 py-3">时间</th><th className="px-4 py-3">操作</th><th className="px-4 py-3">对象</th><th className="px-4 py-3">原因</th><th className="px-4 py-3">状态变化</th></tr></thead><tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">{logs.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">暂无审计记录。</td></tr> : logs.map((log) => <tr key={log.id}><td className="whitespace-nowrap px-4 py-3 text-zinc-500">{new Date(log.created_at).toLocaleString("zh-CN")}</td><td className="px-4 py-3 font-medium">{actionLabels[log.action] ?? log.action}</td><td className="px-4 py-3">{log.target_type} #{log.target_id}</td><td className="max-w-xs px-4 py-3 text-zinc-600 dark:text-zinc-400">{log.reason || "—"}</td><td className="px-4 py-3 text-xs text-zinc-500">{log.before_state || log.after_state ? `${JSON.stringify(log.before_state ?? {})} → ${JSON.stringify(log.after_state ?? {})}` : "—"}</td></tr>)}</tbody></table></div></div></main>;
}
