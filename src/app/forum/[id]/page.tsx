"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AuthControls from "@/components/AuthControls";
import CreateMenu from "@/components/CreateMenu";
import ThemeToggle from "@/components/ThemeToggle";
import { buildCommentPayload } from "@/lib/contentPayloads";
import { getProfileDisplay } from "@/lib/profile";
import { supabase } from "@/lib/supabase";

type Post = {
  id: string;
  title: string;
  content?: string | null;
  category?: string | null;
  author?: string | null;
  created_at?: string | null;
  upvotes?: number | null;
  downvotes?: number | null;
  user_id?: string | null;
};

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

type CurrentUser = {
  id: string;
  email?: string | null;
  user_metadata?: {
    display_name?: string | null;
    username?: string | null;
  } | null;
};

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = useMemo(() => {
    const id = params.id;
    return Array.isArray(id) ? id[0] : id;
  }, [params.id]);

  const [post, setPost] = useState<Post | null>(null);
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);
  const [replyText, setReplyText] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user as CurrentUser | null);
    }

    void loadUser();
  }, []);

  useEffect(() => {
    async function loadPostAndComments() {
      if (!postId) return;

      setIsLoading(true);
      const [postResult, commentsResult] = await Promise.all([
        supabase.from("posts").select("*").eq("id", postId).single(),
        supabase
          .from("comments")
          .select("id, post_id, user_id, content, created_at")
          .eq("post_id", postId)
          .order("created_at", { ascending: true }),
      ]);

      if (postResult.data) {
        setPost(postResult.data as Post);
        setUpvotes(postResult.data.upvotes ?? 0);
        setDownvotes(postResult.data.downvotes ?? 0);
      }

      if (commentsResult.error) {
        setMessage(`评论加载失败：${commentsResult.error.message}`);
      } else {
        setComments((commentsResult.data ?? []) as Comment[]);
      }

      setIsLoading(false);
    }

    void loadPostAndComments();
  }, [postId]);

  async function handleUpvote() {
    if (!postId) return;
    const newUpvotes = upvotes + 1;
    setUpvotes(newUpvotes);
    await supabase.from("posts").update({ upvotes: newUpvotes }).eq("id", postId);
  }

  async function handleDownvote() {
    if (!postId) return;
    const newDownvotes = downvotes + 1;
    setDownvotes(newDownvotes);
    await supabase.from("posts").update({ downvotes: newDownvotes }).eq("id", postId);
  }

  async function handleReply() {
    if (!postId || !replyText.trim()) return;

    if (!user) {
      router.push("/login");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const { data, error } = await supabase
      .from("comments")
      .insert(buildCommentPayload(postId, user.id, replyText))
      .select("id, post_id, user_id, content, created_at")
      .single();

    if (error) {
      setMessage(`回复失败：${error.message}`);
      setIsSubmitting(false);
      return;
    }

    setComments((current) => [...current, data as Comment]);
    setReplyText("");
    setIsSubmitting(false);
  }

  async function handleDeletePost() {
    if (!postId || !user || !post) return;
    if (post.user_id !== user.id) {
      setMessage("只能删除自己的帖子。");
      return;
    }

    if (!confirm("确定要删除这个帖子吗？删除后无法恢复。")) return;

    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) {
      setMessage(`删除失败：${error.message}`);
      return;
    }

    router.push("/forum");
  }

  if (isLoading || !post) {
    return <div className="min-h-screen bg-white p-8 text-zinc-900 dark:bg-[#0a0e14] dark:text-zinc-100">加载中...</div>;
  }

  const currentProfile = user ? getProfileDisplay(user) : null;

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-[#0a0e14] dark:text-zinc-100">
      <header className="flex items-center gap-6 border-b border-zinc-200 px-8 py-4 dark:border-zinc-800">
        <Link href="/" className="text-2xl font-bold text-blue-500 dark:text-blue-400">SkillHub</Link>
        <input
          type="text"
          placeholder="搜索 Skills、Agents、框架..."
          className="max-w-xl flex-1 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
        />
        <nav className="flex items-center gap-5 text-sm text-zinc-600 dark:text-zinc-300">
          <Link href="/skills" className="hover:text-zinc-900 dark:hover:text-white">Skills</Link>
          <Link href="/agents" className="hover:text-zinc-900 dark:hover:text-white">Agents</Link>
          <Link href="/forum" className="hover:text-zinc-900 dark:hover:text-white">论坛</Link>
          <CreateMenu />
          <ThemeToggle />
          <AuthControls />
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-8 py-10">
        <Link href="/forum" className="mb-6 inline-block text-blue-600 hover:underline dark:text-blue-400">← 返回论坛</Link>

        <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mb-4">
            <span className="rounded-md bg-zinc-700 px-3 py-1 text-xs text-zinc-100">{post.category || "综合讨论"}</span>
          </div>

          <div className="mb-4 flex items-start justify-between">
            <h1 className="text-2xl font-bold">{post.title}</h1>
            {user && post.user_id === user.id && (
              <button
                type="button"
                onClick={handleDeletePost}
                className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
              >
                删除
              </button>
            )}
          </div>

          <div className="mb-6 flex items-center gap-2 text-sm">
            <span className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white">作者</span>
            <span className="text-zinc-600 dark:text-zinc-400">{post.author || "用户"}</span>
            {post.created_at && (
              <>
                <span className="text-zinc-500">·</span>
                <span className="text-zinc-500">{new Date(post.created_at).toLocaleDateString("zh-CN")}</span>
              </>
            )}
          </div>

          <p className="mb-6 whitespace-pre-wrap leading-relaxed text-zinc-700 dark:text-zinc-300">
            {post.content || "这个帖子还没有正文。"}
          </p>

          <div className="flex items-center gap-6 border-t border-zinc-200 pt-4 text-sm dark:border-zinc-700">
            <button type="button" onClick={handleUpvote} className="flex items-center gap-1 hover:text-green-600">
              👍 <span>{upvotes}</span>
            </button>
            <button type="button" onClick={handleDownvote} className="flex items-center gap-1 hover:text-red-600">
              👎 <span>{downvotes}</span>
            </button>
            <span className="flex items-center gap-1 text-zinc-500">
              💬 <span>{comments.length} 回复</span>
            </span>
          </div>
        </article>

        <div className="mt-8">
          <h2 className="mb-4 text-xl font-bold">回复 ({comments.length})</h2>

          <div className="mb-6 space-y-4">
            {comments.length === 0 ? (
              <div className="border-y border-zinc-200 py-6 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">还没有回复。</div>
            ) : (
              comments.map((comment) => (
                <article key={comment.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-md bg-blue-600 px-2 py-0.5 text-xs text-white">
                      {comment.user_id === user?.id ? "我" : "用户"}
                    </span>
                    <span className="text-sm font-medium">
                      {comment.user_id === user?.id ? currentProfile?.name : "社区用户"}
                    </span>
                    <span className="text-xs text-zinc-500">· {new Date(comment.created_at).toLocaleString("zh-CN")}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{comment.content}</p>
                </article>
              ))
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <textarea
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              placeholder="写下你的回复..."
              className="mb-3 min-h-24 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
            {message && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{message}</p>}
            <button
              type="button"
              onClick={handleReply}
              disabled={isSubmitting}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:cursor-wait disabled:opacity-60"
            >
              {isSubmitting ? "发送中..." : "发送回复"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
