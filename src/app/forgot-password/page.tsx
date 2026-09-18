"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    if (error) { setMessage(`发送失败：${error.message}`); return; }
    setSent(true); setMessage("如果该邮箱已注册，找回链接会发送到对应邮箱。请检查收件箱或测试邮箱捕获服务。");
  }
  return <div className="flex min-h-screen items-center justify-center bg-white px-4 text-zinc-900 dark:bg-[#0a0e14] dark:text-zinc-100"><form onSubmit={submit} className="w-full max-w-md rounded-xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-800 dark:bg-zinc-900/40"><h1 className="mb-3 text-2xl font-bold">找回密码</h1><p className="mb-6 text-sm text-zinc-500">输入注册邮箱，我们会发送一次性重设链接。</p><label className="mb-1 block text-sm text-zinc-500" htmlFor="reset-email">邮箱</label><input id="reset-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mb-4 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" /><button type="submit" disabled={sent} className="w-full rounded-md bg-green-600 py-2.5 font-medium text-white disabled:opacity-60">{sent ? "已发送" : "发送找回链接"}</button>{message && <p role="status" className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">{message}</p>}<Link href="/login" className="mt-5 block text-center text-sm text-blue-600 hover:underline">返回登录</Link></form></div>;
}
