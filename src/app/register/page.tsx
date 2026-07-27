"use client"; // 这行的意思：这个页面要能响应用户的输入和点击（叫"客户端页面"）

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

export default function RegisterPage() {
  const router = useRouter();

  // 下面这几行：为每个输入框准备一个"盒子"，用来装用户输入的内容
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(""); // 用来显示成功/错误提示

  // 点"创建账号"时，运行这个函数
  async function handleRegister() {
    setMessage("正在创建...");

    // 调用 Supabase 的注册功能，把邮箱密码交给它（它会自动加密处理）
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // 把用户名、显示名称也一起存起来
        data: { username, display_name: displayName },
      },
    });

    if (error) {
      setMessage("出错了：" + error.message); // 失败，显示原因
    } else {
      setMessage("注册成功！正在跳转...");
      setTimeout(() => router.push("/"), 1500); // 成功后 1.5 秒跳回首页
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0e14] text-zinc-900 dark:text-zinc-100 flex items-center justify-center px-4">
      {/* 右上角主题切换 */}
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-8">
        <h1 className="text-2xl font-bold text-center mb-6">注册 SkillHub</h1>

        {/* 邮箱 */}
        <label className="block text-sm text-zinc-500 dark:text-zinc-400 mb-1">邮箱</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 px-3 py-2 mb-4 text-sm"
        />

        {/* 用户名 */}
        <label className="block text-sm text-zinc-500 dark:text-zinc-400 mb-1">用户名</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-md bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 px-3 py-2 mb-4 text-sm"
        />

        {/* 显示名称 */}
        <label className="block text-sm text-zinc-500 dark:text-zinc-400 mb-1">显示名称</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-md bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 px-3 py-2 mb-4 text-sm"
        />

        {/* 密码 */}
        <label className="block text-sm text-zinc-500 dark:text-zinc-400 mb-1">密码</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 px-3 py-2 mb-2 text-sm"
        />
        <p className="text-xs text-zinc-500 mb-4">至少 8 个字符</p>

        {/* 创建账号按钮 */}
        <button
          onClick={handleRegister}
          className="w-full rounded-md bg-green-600 py-2.5 font-medium text-white hover:bg-green-500"
        >
          创建账号
        </button>

        {/* 提示信息 */}
        {message && <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-300">{message}</p>}

        <p className="mt-4 text-center text-sm text-zinc-500">
          已有账号？ <a href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">登录</a>
        </p>
      </div>
    </div>
  );
}
