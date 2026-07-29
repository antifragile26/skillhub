"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PublishPageShell, { inputClassName, labelClassName } from "@/components/PublishPageShell";
import { getProfileDisplay } from "@/lib/profile";
import { postCategories } from "@/lib/forumCategories";
import { supabase } from "@/lib/supabase";

export default function NewPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("question");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function publishPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !content.trim()) {
      setMessage("请填写标题和正文。");
      return;
    }

    setIsSubmitting(true);
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.push("/login");
      return;
    }

    const profile = getProfileDisplay(data.user);
    const { error } = await supabase.from("posts").insert({
      title: title.trim(),
      content: content.trim(),
      category,
      author: profile.name,
      user_id: data.user.id,
    });

    if (error) {
      setMessage(`发布失败：${error.message}`);
      setIsSubmitting(false);
      return;
    }

    router.push("/forum");
  }

  return (
    <PublishPageShell title="发布新帖子" description="分享问题、展示成果，或讨论 Skill 和 Agent 的使用经验。">
      <form className="space-y-6" onSubmit={publishPost}>
        <div>
          <span className={labelClassName}>标签分类</span>
          <div className="flex flex-wrap gap-3">
            {postCategories.map((item) => (
              <label key={item.value} className="cursor-pointer">
                <input type="radio" name="category" value={item.value} checked={category === item.value} onChange={() => setCategory(item.value)} className="peer sr-only" />
                <span className="block rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-600 transition peer-checked:border-blue-500 peer-checked:text-blue-600 dark:border-zinc-700 dark:bg-[#0f141c] dark:text-zinc-300 dark:peer-checked:border-zinc-200 dark:peer-checked:text-white">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className={labelClassName} htmlFor="post-title">标题</label>
          <input id="post-title" value={title} onChange={(event) => setTitle(event.target.value)} className={inputClassName} placeholder="用一句话说明你想讨论的内容" />
        </div>
        <div>
          <label className={labelClassName} htmlFor="post-body">正文</label>
          <textarea id="post-body" value={content} onChange={(event) => setContent(event.target.value)} className={`${inputClassName} min-h-72 resize-y font-mono`} placeholder="支持 Markdown。" />
        </div>
        {message && <p className="text-sm text-red-600 dark:text-red-400">{message}</p>}
        <div className="flex justify-end gap-4">
          <Link href="/forum" className="rounded-md border border-zinc-300 px-6 py-3 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900">取消</Link>
          <button type="submit" disabled={isSubmitting} className="rounded-md bg-green-600 px-8 py-3 font-medium text-white disabled:cursor-wait disabled:opacity-60">{isSubmitting ? "发布中..." : "发布帖子"}</button>
        </div>
      </form>
    </PublishPageShell>
  );
}
