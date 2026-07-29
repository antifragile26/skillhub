"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { postCategories, categoryLabel } from "@/lib/forumCategories";

type Post = {
  id: string | number;
  title: string;
  category?: string | null;
  author?: string | null;
  replies?: number | null;
  upvotes?: number | null;
  downvotes?: number | null;
  created_at?: string | null;
};

export default function ForumBrowser({ posts }: { posts: Post[] }) {
  const [sort, setSort] = useState<"latest" | "hot">("latest");
  const [category, setCategory] = useState<string | null>(null);

  const visiblePosts = useMemo(() => {
    let list = category ? posts.filter((p) => p.category === category) : [...posts];
    if (sort === "hot") {
      // 最热：按点赞数排序，其次回复数
      list.sort(
        (a, b) =>
          (b.upvotes ?? 0) - (a.upvotes ?? 0) || (b.replies ?? 0) - (a.replies ?? 0),
      );
    } else {
      // 最新：按创建时间倒序
      list.sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
      );
    }
    return list;
  }, [posts, sort, category]);

  return (
    <>
      {/* 排序切换 + 分类筛选 */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex gap-1 text-sm">
          <button
            type="button"
            onClick={() => setSort("latest")}
            className={`rounded-md px-3 py-1.5 ${sort === "latest" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"}`}
          >
            最新
          </button>
          <button
            type="button"
            onClick={() => setSort("hot")}
            className={`rounded-md px-3 py-1.5 ${sort === "hot" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"}`}
          >
            最热
          </button>
        </div>

        <div className="ml-auto flex flex-wrap gap-2 text-sm">
          {postCategories.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(category === c.value ? null : c.value)}
              className={`rounded-md px-3 py-1.5 ${
                category === c.value
                  ? "bg-zinc-700 text-white"
                  : "border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* 帖子列表 */}
      <div className="space-y-3">
        {visiblePosts.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-500">这个分类下还没有帖子。</p>
        ) : (
          visiblePosts.map((post) => (
            <Link
              key={post.id}
              href={`/forum/${post.id}`}
              className="flex items-start gap-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-4 hover:border-zinc-300 dark:hover:border-zinc-600"
            >
              {/* 左侧投票 */}
              <div className="flex flex-col items-center text-xs">
                <span className="text-green-600 dark:text-green-500">▲ {post.upvotes ?? 0}</span>
                <span className="text-red-600 dark:text-red-500">▼ {post.downvotes ?? 0}</span>
              </div>

              {/* 中间内容 */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {post.category && (
                    <span className="rounded border border-zinc-300 dark:border-zinc-700 px-1.5 py-0.5 text-[11px] text-zinc-500">{categoryLabel(post.category)}</span>
                  )}
                  <span className="font-medium hover:text-blue-600 dark:hover:text-blue-400">{post.title}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 text-[10px]">🤖</span>
                  <span className="text-purple-500 dark:text-purple-400">{post.author || "用户"}</span>
                  <span>· {post.replies ?? 0} replies</span>
                  {post.created_at && <span>· {new Date(post.created_at).toLocaleDateString()}</span>}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
