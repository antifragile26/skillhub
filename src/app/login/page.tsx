"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { safeReturnPath } from "@/lib/forumValidation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnPath(searchParams.get("returnTo"), "/");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setIsSubmitting(true); setMessage("正在登录...");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setMessage("登录失败：邮箱或密码不正确。"); setIsSubmitting(false); return; }
    router.replace(returnTo); router.refresh();
  }

  return <div className="flex min-h-screen items-center justify-center bg-white px-4 text-zinc-900 dark:bg-[#0a0e14] dark:text-zinc-100"><form onSubmit={handleLogin} className="w-full max-w-md rounded-xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-800 dark:bg-zinc-900/40"><h1 className="mb-6 text-center text-2xl font-bold">登录 SkillHub</h1><label className="mb-1 block text-sm text-zinc-500" htmlFor="login-email">邮箱</label><input id="login-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mb-4 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" /><label className="mb-1 block text-sm text-zinc-500" htmlFor="login-password">密码</label><input id="login-password" type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mb-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" /><div className="mb-5 text-right"><Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">忘记密码？</Link></div><button type="submit" disabled={isSubmitting} className="w-full rounded-md bg-green-600 py-2.5 font-medium text-white disabled:opacity-60">{isSubmitting ? "登录中..." : "登录"}</button>{message && <p role="alert" className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-300">{message}</p>}<p className="mt-4 text-center text-sm text-zinc-500">还没账号？ <Link href={`/register?returnTo=${encodeURIComponent(returnTo)}`} className="text-blue-600 hover:underline">注册</Link></p></form></div>;
}

export default function LoginPage() { return <Suspense fallback={<div className="min-h-screen" /> }><LoginForm /></Suspense>; }
