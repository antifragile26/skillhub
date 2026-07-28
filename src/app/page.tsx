// 这是首页文件。下面的代码描述了页面上要显示什么、长什么样。

// 从我们刚写的连接文件里，拿到访问数据库的通道
import { supabase } from "@/lib/supabase";
import CreateMenu from "@/components/CreateMenu";
import ThemeToggle from "@/components/ThemeToggle";
import AuthControls from "@/components/AuthControls";
import Link from "next/link";

// 注意这里多了 async —— 意思是"这个页面需要等数据库回话"
export default async function Home() {

  // 👇 去数据库问一句："skills 表里的数据，按下载量从高到低给我"
  const { data: trendingSkills } = await supabase
    .from("skills")           // 从 skills 这张表
    .select("*")              // 要所有列
    .order("downloads", { ascending: false }); // 按下载量从高到低排

  return (
    // 整个页面：深色背景（接近黑），文字浅色
    <div className="min-h-screen bg-white dark:bg-[#0a0e14] text-zinc-900 dark:text-zinc-100">

      {/* ===== 顶部导航栏 ===== */}
      <header className="flex items-center gap-6 px-8 py-4 border-b border-zinc-200 dark:border-zinc-800">
        {/* 左边：蓝色 Logo */}
        <div className="text-2xl font-bold text-blue-500 dark:text-blue-400">SkillHub</div>
        {/* 中间：搜索框 */}
        <input
          type="text"
          placeholder="🔍 搜索 Skills、Agents、框架..."
          className="flex-1 max-w-xl rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-200 placeholder-zinc-500"
        />
        {/* 右边：导航链接 + 按钮 */}
        <nav className="flex items-center gap-5 text-sm text-zinc-600 dark:text-zinc-300">
          <Link href="/skills" className="hover:text-zinc-900 dark:hover:text-white">Skills</Link>
          <Link href="/agents" className="hover:text-zinc-900 dark:hover:text-white">Agents</Link>
          <Link href="/forum" className="hover:text-zinc-900 dark:hover:text-white">论坛</Link>
          <CreateMenu />
          <ThemeToggle />
          <AuthControls />
        </nav>
      </header>

      {/* ===== 中间的大标题区 ===== */}
      <section className="flex flex-col items-center text-center py-20 px-4">
        <h1 className="text-5xl font-extrabold tracking-tight">
          <span className="text-blue-500 dark:text-blue-400">AI Agent 技能</span>
          <span className="text-zinc-900 dark:text-white">的开放注册中心</span>
        </h1>
        <p className="mt-5 text-lg text-zinc-500 dark:text-zinc-400">发现、发布、分享你的 Agent Skill</p>

        {/* 两个按钮 */}
        <div className="mt-8 flex gap-4">
          <Link href="/skills" className="rounded-md bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-500">浏览全部</Link>
          <Link href="/publish" className="rounded-md border border-zinc-300 dark:border-zinc-600 px-6 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800">发布你的第一个 Skill →</Link>
        </div>

        {/* 三个统计 */}
        <div className="mt-10 flex gap-10 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          <Link href="/skills" className="hover:text-blue-600 dark:hover:text-blue-400">📦 Skills</Link>
          <Link href="/agents" className="hover:text-blue-600 dark:hover:text-blue-400">🤖 Agents</Link>
          <Link href="/forum" className="hover:text-blue-600 dark:hover:text-blue-400">💬 论坛</Link>
        </div>
      </section>

      {/* ===== 本周趋势 Skill ===== */}
      <section className="max-w-6xl mx-auto px-8 pb-20">
        {/* 标题行：左边标题，右边"查看全部" */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">🔥 本周趋势 Skill</h2>
          <Link href="/skills" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">查看全部 →</Link>
        </div>

        {/* 卡片网格：一行 3 个 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(trendingSkills ?? []).map((skill) => (
            <div key={skill.name} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-5 hover:border-zinc-300 dark:hover:border-zinc-600">
              {/* 名字 + 版本 */}
              <div className="flex items-start justify-between">
                <span className="font-mono text-blue-600 dark:text-blue-300">{skill.name}</span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">{skill.version}</span>
              </div>
              {/* 描述 */}
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{skill.description}</p>
              {/* 下载量 */}
              <p className="mt-4 text-sm text-zinc-500">↓ {skill.downloads}</p>
              {/* 标签 */}
              <div className="mt-3 flex gap-2">
                {(skill.tags ?? []).map((tag: string) => (
                  <span key={tag} className="rounded bg-blue-100 dark:bg-blue-500/10 px-2 py-0.5 text-xs font-mono text-blue-700 dark:text-blue-300">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
