"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthControls from "@/components/AuthControls";
import CreateMenu from "@/components/CreateMenu";
import ThemeToggle from "@/components/ThemeToggle";
import { getProfileDisplay } from "@/lib/profile";
import { supabase } from "@/lib/supabase";

type ContentItem = {
  id: string;
  name?: string;
  title?: string;
  content?: string;
  description?: string;
  framework?: string;
  version?: string;
  created_at?: string;
};

type ContentGroups = {
  agents: ContentItem[];
  skills: ContentItem[];
  posts: ContentItem[];
  comments: ContentItem[];
};

const emptyGroups: ContentGroups = { agents: [], skills: [], posts: [], comments: [] };

function ContentSection({ title, items, href, action, kind }: {
  title: string;
  items: ContentItem[];
  href: string;
  action: string;
  kind: "agent" | "skill" | "post" | "comment";
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Link href={href} className="text-sm text-blue-600 hover:underline dark:text-blue-400">{action}</Link>
      </div>
      {items.length === 0 ? (
        <div className="border-y border-zinc-200 py-6 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">还没有相关内容。</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                  {kind === "post" ? item.title : kind === "comment" ? "论坛回复" : item.name}
                </h3>
                {kind === "agent" && item.framework && <span className="text-xs text-zinc-500">{item.framework}</span>}
                {kind === "skill" && item.version && <span className="text-xs text-zinc-500">v{item.version}</span>}
              </div>
              {(item.description || item.content) && <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{item.description || item.content}</p>}
              {item.created_at && <p className="mt-3 text-xs text-zinc-500">{new Date(item.created_at).toLocaleDateString("zh-CN")}</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string | null; user_metadata?: Record<string, string | null> } | null>(null);
  const [content, setContent] = useState<ContentGroups>(emptyGroups);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }

      setUser(data.user);
      const [agents, skills, posts, comments] = await Promise.all([
        supabase.from("agents").select("id, name, framework, description, created_at").eq("user_id", data.user.id).order("created_at", { ascending: false }),
        supabase.from("skills").select("id, name, version, description, created_at").eq("user_id", data.user.id).order("created_at", { ascending: false }),
        supabase.from("posts").select("id, title, content, created_at").eq("user_id", data.user.id).order("created_at", { ascending: false }),
        supabase.from("comments").select("id, content, created_at").eq("user_id", data.user.id).order("created_at", { ascending: false }),
      ]);
      const firstError = [agents.error, skills.error, posts.error, comments.error].find(Boolean);

      setContent({
        agents: (agents.data ?? []) as ContentItem[],
        skills: (skills.data ?? []) as ContentItem[],
        posts: (posts.data ?? []) as ContentItem[],
        comments: (comments.data ?? []) as ContentItem[],
      });
      setLoadError(firstError ? `个人内容加载失败：${firstError.message}` : "");
      setIsLoading(false);
    }

    void loadProfile();
  }, [router]);

  if (!user) return <div className="min-h-screen bg-white dark:bg-[#0a0e14]" />;

  const profile = getProfileDisplay(user);
  const total = content.agents.length + content.skills.length + content.posts.length + content.comments.length;

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-[#0a0e14] dark:text-zinc-100">
      <header className="flex flex-wrap items-center gap-5 border-b border-zinc-200 px-5 py-4 sm:px-8 dark:border-zinc-800">
        <Link href="/" className="text-2xl font-bold text-blue-500 dark:text-blue-400">SkillHub</Link>
        <nav className="ml-auto flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-300">
          <Link href="/skills" className="hover:text-zinc-900 dark:hover:text-white">Skills</Link>
          <Link href="/agents" className="hover:text-zinc-900 dark:hover:text-white">Agents</Link>
          <Link href="/forum" className="hover:text-zinc-900 dark:hover:text-white">论坛</Link>
          <CreateMenu />
          <ThemeToggle />
          <AuthControls />
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <section className="border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-3xl font-semibold text-white">{profile.initial}</div>
            <div>
              <h1 className="text-3xl font-bold">{profile.name}</h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{user.email}</p>
            </div>
            <p className="ml-auto text-sm text-zinc-500 dark:text-zinc-400">{isLoading ? "正在整理内容..." : `${total} 条个人内容`}</p>
          </div>
        </section>

        {loadError && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            {loadError}
          </div>
        )}

        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <ContentSection title="我发布的 Agent" items={content.agents} href="/agents/new" action="发布 Agent" kind="agent" />
          <ContentSection title="我发布的 Skill" items={content.skills} href="/publish" action="发布 Skill" kind="skill" />
          <ContentSection title="我的帖子" items={content.posts} href="/forum/new" action="发布帖子" kind="post" />
          <ContentSection title="我的评论" items={content.comments} href="/forum" action="浏览论坛" kind="comment" />
        </div>
      </main>
    </div>
  );
}
