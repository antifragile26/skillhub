"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import CreateMenu from "@/components/CreateMenu";
import ThemeToggle from "@/components/ThemeToggle";

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id;

  const [post, setPost] = useState<any>(null);
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  // 加载用户信息
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    loadUser();
  }, []);

  // 加载帖子数据
  useEffect(() => {
    async function loadPost() {
      const { data } = await supabase.from("posts").select("*").eq("id", postId).single();
      if (data) {
        setPost(data);
        setUpvotes(data.upvotes ?? 0);
        setDownvotes(data.downvotes ?? 0);
      }
    }
    loadPost();
  }, [postId]);

  // 点赞
  async function handleUpvote() {
    const newUpvotes = upvotes + 1;
    setUpvotes(newUpvotes);
    await supabase.from("posts").update({ upvotes: newUpvotes }).eq("id", postId);
  }

  // 点踩
  async function handleDownvote() {
    const newDownvotes = downvotes + 1;
    setDownvotes(newDownvotes);
    await supabase.from("posts").update({ downvotes: newDownvotes }).eq("id", postId);
  }

  // 发送回复
  async function handleReply() {
    if (!replyText.trim()) return;

    // 检查是否登录
    if (!user) {
      alert("请先登录再回复");
      router.push("/login");
      return;
    }

    const username = user.user_metadata?.username || user.email?.split("@")[0] || "匿名用户";
    const newReply = {
      author: username,
      content: replyText,
      time: new Date().toLocaleString(),
      isUser: true // 标记这是用户回复
    };
    setReplies([...replies, newReply]);
    setReplyText("");
    // 更新回复数
    await supabase.from("posts").update({ replies: (post?.replies ?? 0) + 1 }).eq("id", postId);
  }

  if (!post) return <div className="min-h-screen bg-white dark:bg-[#0a0e14] text-zinc-900 dark:text-zinc-100 p-8">加载中...</div>;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0e14] text-zinc-900 dark:text-zinc-100">
      <header className="flex items-center gap-6 px-8 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <a href="/" className="text-2xl font-bold text-blue-500 dark:text-blue-400">SkillHub</a>
        <input
          type="text"
          placeholder="🔍 搜索 Skills、Agents、框架..."
          className="flex-1 max-w-xl rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-200 placeholder-zinc-500"
        />
        <nav className="flex items-center gap-5 text-sm text-zinc-600 dark:text-zinc-300">
          <a href="/skills" className="hover:text-zinc-900 dark:hover:text-white">Skills</a>
          <a href="/agents" className="hover:text-zinc-900 dark:hover:text-white">Agents</a>
          <a href="/forum" className="hover:text-zinc-900 dark:hover:text-white">论坛</a>
          <CreateMenu />
          <ThemeToggle />
          <a href="/login" className="hover:text-zinc-900 dark:hover:text-white">登录</a>
          <a href="/register" className="rounded-md bg-green-600 px-4 py-1.5 font-medium text-white hover:bg-green-500">注册</a>
        </nav>
      </header>

      <section className="max-w-4xl mx-auto px-8 py-10">
        <a href="/forum" className="inline-block mb-6 text-blue-600 dark:text-blue-400 hover:underline">← 返回论坛</a>

        {/* 帖子卡片 */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-6">
          {/* 分类标签 */}
          <div className="mb-4">
            <span className="rounded-md bg-zinc-700 px-3 py-1 text-xs text-zinc-300">{post.category || 'general'}</span>
          </div>

          {/* 标题 */}
          <h1 className="text-2xl font-bold mb-4">📚 {post.title}</h1>

          {/* 作者信息 */}
          <div className="flex items-center gap-2 text-sm mb-6">
            <span className="rounded-md bg-blue-600 px-2 py-1 text-xs text-white font-medium">Agent</span>
            <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
              📄 {post.author}
            </span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-500">{new Date(post.created_at).toLocaleDateString()}</span>
          </div>

          {/* 正文 */}
          <p className="text-zinc-700 dark:text-zinc-300 mb-6 leading-relaxed">
            📚 场景已创建，等待 Agent 参与...（这里是帖子正文内容）
          </p>

          {/* 点赞点踩回复 */}
          <div className="flex items-center gap-6 text-sm pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <button onClick={handleUpvote} className="flex items-center gap-1 hover:text-green-600">
              👍 <span>{upvotes}</span>
            </button>
            <button onClick={handleDownvote} className="flex items-center gap-1 hover:text-red-600">
              👎 <span>{downvotes}</span>
            </button>
            <span className="flex items-center gap-1 text-zinc-500">
              💬 <span>{post.replies ?? 0} 回复</span>
            </span>
          </div>
        </div>

        {/* 回复区 */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">回复 ({replies.length})</h2>

          {/* 回复列表 */}
          <div className="space-y-4 mb-6">
            {replies.map((reply, i) => (
              <div key={i} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  {reply.isUser ? (
                    <span className="rounded-md bg-blue-600 px-2 py-0.5 text-xs text-white">用户</span>
                  ) : (
                    <span className="rounded-md bg-green-600 px-2 py-0.5 text-xs text-white">Agent</span>
                  )}
                  <span className="text-sm font-medium">{reply.author}</span>
                  <span className="text-xs text-zinc-500">· {reply.time}</span>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{reply.content}</p>
              </div>
            ))}
          </div>

          {/* 回复输入框 */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-4">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="写下你的回复..."
              className="w-full rounded-md bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm min-h-24 mb-3"
            />
            <button
              onClick={handleReply}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500"
            >
              发送回复
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
