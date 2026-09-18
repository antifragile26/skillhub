"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("正在验证重设链接...");
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => { if ((event === "PASSWORD_RECOVERY" || session) && !done) { setReady(true); setMessage(""); } });
    void supabase.auth.getSession().then(({ data }) => { if (data.session) { setReady(true); setMessage(""); } else setMessage("链接无效或已过期，请重新获取找回链接。"); });
    return () => subscription.subscription.unsubscribe();
  }, [done]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (password.length < 8) { setMessage("新密码至少需要 8 个字符。"); return; } if (password !== confirm) { setMessage("两次输入的密码不一致。"); return; }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setMessage(`重设失败：${error.message}`); return; }
    setDone(true); setReady(false); setMessage("密码已更新，旧密码已失效。请使用新密码登录。"); await supabase.auth.signOut();
  }
  return <div className="flex min-h-screen items-center justify-center bg-white px-4 text-zinc-900 dark:bg-[#0a0e14] dark:text-zinc-100"><form onSubmit={submit} className="w-full max-w-md rounded-xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-800 dark:bg-zinc-900/40"><h1 className="mb-6 text-2xl font-bold">设置新密码</h1>{ready && !done ? <><label className="mb-1 block text-sm text-zinc-500" htmlFor="new-password">新密码</label><input id="new-password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="mb-4 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" /><label className="mb-1 block text-sm text-zinc-500" htmlFor="confirm-password">确认新密码</label><input id="confirm-password" type="password" minLength={8} required value={confirm} onChange={(event) => setConfirm(event.target.value)} className="mb-4 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" /><button type="submit" className="w-full rounded-md bg-green-600 py-2.5 font-medium text-white">更新密码</button></> : null}{message && <p role="status" className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">{message}</p>}<Link href="/login" className="mt-5 block text-center text-sm text-blue-600 hover:underline">返回登录</Link></form></div>;
}
