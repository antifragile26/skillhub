"use client";

import Link from "next/link";
import ForumHeader from "@/components/ForumHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Notice = { id: string; kind: string; target_type: string; target_id?: string | null; message: string; read_at?: string | null; created_at: string };

export default function NotificationsPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => { void supabase.from("notifications").select("id,kind,target_type,target_id,message,read_at,created_at").order("created_at", { ascending: false }).limit(100).then(({ data, error }) => { if (error) setMessage("请先登录后查看通知。"); else setNotices((data ?? []) as Notice[]); }); }, []);
  async function mark(id?: string) { if (id) await supabase.rpc("mark_notification_read", { p_notification_id: id }); else await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null); setNotices((items) => items.map((item) => id && item.id !== id ? item : { ...item, read_at: new Date().toISOString() })); }
  return <div className="min-h-screen bg-white text-zinc-900 dark:bg-[#0a0e14] dark:text-zinc-100"><ForumHeader /><main className="px-5 py-10 sm:px-8"><div className="mx-auto max-w-3xl"><div className="flex items-center justify-between"><div><Link href="/forum" className="text-sm text-blue-600">← 返回论坛</Link><h1 className="mt-4 text-3xl font-bold">通知</h1></div><button type="button" onClick={() => void mark()} className="text-sm text-blue-600">全部标为已读</button></div>{message && <p className="mt-8 rounded-md bg-amber-50 p-4 text-sm text-amber-800">{message}</p>}<div className="mt-8 space-y-3">{notices.length === 0 && !message ? <p className="py-10 text-center text-sm text-zinc-500">暂无通知。</p> : notices.map((notice) => <article key={notice.id} className={`rounded-lg border p-4 ${notice.read_at ? "border-zinc-200 dark:border-zinc-800" : "border-blue-300 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20"}`}><div className="flex items-start justify-between gap-4"><p className="text-sm">{notice.message}</p>{!notice.read_at && <button type="button" onClick={() => void mark(notice.id)} className="shrink-0 text-xs text-blue-600">标为已读</button>}</div><div className="mt-2 flex gap-3 text-xs text-zinc-500"><time>{new Date(notice.created_at).toLocaleString("zh-CN")}</time>{notice.target_type === "post" && notice.target_id && <Link href={`/forum/${notice.target_id}`} className="text-blue-600">查看帖子</Link>}{notice.target_type === "knowledge" && notice.target_id && <Link href={`/knowledge/${notice.target_id}`} className="text-blue-600">查看知识</Link>}</div></article>)}</div></div></main></div>;
}
