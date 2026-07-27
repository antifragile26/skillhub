"use client"; // 有输入框和按钮的互动页面

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  // 点"登录"时运行
  async function handleLogin() {
    setMessage("正在登录...");
    // 调用 Supabase 登录功能，它会自动核对密码对不对
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage("登录失败：" + error.message);
    } else {
      setMessage("登录成功！正在跳转...");
      setTimeout(() => router.push("/"), 1000);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0e14] text-zinc-900 dark:text-zinc-100 flex items-center justify-center px-4">
      {/* 右上角主题切换 */}
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-8">
        <h1 className="text-2xl font-bold text-center mb-6">登录 SkillHub</h1>

        <label className="block text-sm text-zinc-500 dark:text-zinc-400 mb-1">邮箱</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 px-3 py-2 mb-4 text-sm"
        />

        <label className="block text-sm text-zinc-500 dark:text-zinc-400 mb-1">密码</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 px-3 py-2 mb-4 text-sm"
        />

        <button
          onClick={handleLogin}
          className="w-full rounded-md bg-green-600 py-2.5 font-medium text-white hover:bg-green-500"
        >
          登录
        </button>

        {message && <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-300">{message}</p>}

        <p className="mt-4 text-center text-sm text-zinc-500">
          还没账号？ <a href="/register" className="text-blue-600 dark:text-blue-400 hover:underline">注册</a>
        </p>
      </div>
    </div>
  );
}
