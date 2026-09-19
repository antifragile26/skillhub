"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SafeMarkdown from "@/components/SafeMarkdown";
import { categoryLabel } from "@/lib/forumCategories";
import { getProfileDisplay } from "@/lib/profile";
import { getSupabaseErrorMessage, hashSessionId } from "@/lib/batch2";
import { makeRequestId, normalizeForumText, validatePostInput, validateReplyInput } from "@/lib/forumValidation";
import { supabase } from "@/lib/supabase";

type Post = { id: string; title: string; content?: string | null; category?: string | null; content_type?: string | null; author?: string | null; created_at?: string | null; upvotes?: number | null; downvotes?: number | null; user_id?: string | null; resolved?: boolean; accepted_comment_id?: string | null; is_featured?: boolean; case_scenario?: string | null; case_goal?: string | null; case_tools_environment?: string | null; case_steps?: string | null; case_input_example?: string | null; case_output_example?: string | null; case_effects?: string | null; case_limitations?: string | null };
type Comment = { id: string; post_id: string; user_id: string; author?: string | null; content: string; created_at: string; upvotes?: number | null; downvotes?: number | null; parent_comment_id?: string | null };
type User = { id: string; email?: string | null; user_metadata?: { display_name?: string | null; username?: string | null } | null };
type ProductLink = { id: string; content_id: string; product_type: "skill" | "agent"; product_id: string };
type RelatedPost = { id: number; title: string; category?: string | null; author?: string | null; created_at?: string | null };

const actionClass = "inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:bg-blue-950/40 dark:hover:text-blue-200";
const dangerActionClass = "inline-flex items-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/70 dark:bg-slate-800 dark:text-red-300 dark:hover:bg-red-950/40";

function sessionHash() {
  if (typeof window === "undefined") return hashSessionId("server");
  const key = window.localStorage.getItem("skillhub:session") ?? crypto.randomUUID();
  window.localStorage.setItem("skillhub:session", key);
  return hashSessionId(key);
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = String(params.id ?? "");
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [links, setLinks] = useState<ProductLink[]>([]);
  const [products, setProducts] = useState<Record<string, { name: string; href: string }>>({});
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [up, setUp] = useState(0);
  const [down, setDown] = useState(0);
  const [myVote, setMyVote] = useState<"up" | "down" | null>(null);
  const [busy, setBusy] = useState(false);
  const [commentVotes, setCommentVotes] = useState<Record<string, "up" | "down" | null>>({});
  const [editingPost, setEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editComment, setEditComment] = useState("");
  const [accepted, setAccepted] = useState<string | null>(null);

  useEffect(() => { void supabase.auth.getUser().then(({ data }) => setUser(data.user as User | null)); }, []);

  useEffect(() => {
    async function load() {
      if (!postId) return;
      const [p, c] = await Promise.all([
        supabase.from("posts").select("*").eq("id", postId).is("deleted_at", null).maybeSingle(),
        supabase.from("comments").select("id,post_id,user_id,author,content,created_at,upvotes,downvotes,parent_comment_id").eq("post_id", postId).eq("status", "published").is("deleted_at", null).order("created_at", { ascending: true }),
      ]);
      if (!p.data) {
        setMessage(p.error ? "帖子加载失败，请重试。" : "帖子不存在、已删除或暂时不可见。");
        setLoading(false);
        return;
      }
      const value = p.data as Post;
      setPost(value);
      setEditTitle(value.title);
      setEditContent(value.content ?? "");
      setUp(value.upvotes ?? 0);
      setDown(value.downvotes ?? 0);
      setAccepted(value.accepted_comment_id ?? null);
      const loadedComments = (c.data ?? []) as Comment[];
      setComments(loadedComments);

      const [related, linkResult] = await Promise.all([
        value.category ? supabase.from("posts").select("id,title,category,author,created_at").eq("category", value.category).eq("status", "published").is("deleted_at", null).neq("id", postId).order("created_at", { ascending: false }).limit(5) : Promise.resolve({ data: [] }),
        supabase.from("content_product_links").select("id,content_id,product_type,product_id").eq("content_type", "post").eq("content_id", postId),
      ]);
      setRelatedPosts((related.data ?? []) as RelatedPost[]);
      const loadedLinks = (linkResult.data ?? []) as ProductLink[];
      setLinks(loadedLinks);
      const nextProducts: Record<string, { name: string; href: string }> = {};
      await Promise.all(loadedLinks.map(async (link) => {
        const table = link.product_type === "skill" ? "skills" : "agents";
        const result = await supabase.from(table).select("id,name").eq("id", link.product_id).maybeSingle();
        if (result.data) nextProducts[link.id] = { name: result.data.name, href: `/${link.product_type === "skill" ? "skills" : "agents"}/${result.data.id}` };
      }));
      setProducts(nextProducts);
      if (user) {
        const vote = await supabase.from("votes").select("vote_type").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
        setMyVote(vote.data?.vote_type === "up" || vote.data?.vote_type === "down" ? vote.data.vote_type : null);
        if (loadedComments.length) {
          const own = await supabase.from("comment_votes").select("comment_id,vote_type").in("comment_id", loadedComments.map((item) => item.id)).eq("user_id", user.id);
          const next: Record<string, "up" | "down" | null> = {};
          for (const item of own.data ?? []) next[item.comment_id] = item.vote_type as "up" | "down";
          setCommentVotes(next);
        }
      }
      setLoading(false);
    }
    void load();
  }, [postId, user]);

  async function vote(kind: "up" | "down", commentId?: string) {
    if (!user) { router.push(`/login?returnTo=${encodeURIComponent(`/forum/${postId}`)}`); return; }
    const current = commentId ? commentVotes[commentId] : myVote;
    const removing = current === kind;
    const result = commentId
      ? (removing ? await supabase.from("comment_votes").delete().eq("comment_id", commentId).eq("user_id", user.id) : await supabase.from("comment_votes").upsert({ comment_id: commentId, user_id: user.id, vote_type: kind }, { onConflict: "user_id,comment_id" }))
      : (removing ? await supabase.from("votes").delete().eq("post_id", postId).eq("user_id", user.id) : await supabase.from("votes").upsert({ user_id: user.id, post_id: postId, vote_type: kind }, { onConflict: "user_id,post_id" }));
    if (result.error) { setMessage(`投票失败：${result.error.message}`); return; }
    if (commentId) {
      setCommentVotes((items) => ({ ...items, [commentId]: removing ? null : kind }));
      const count = await supabase.from("comments").select("upvotes,downvotes").eq("id", commentId).maybeSingle();
      if (count.data) setComments((items) => items.map((item) => item.id === commentId ? { ...item, ...count.data } : item));
    } else {
      setMyVote(removing ? null : kind);
      const count = await supabase.from("posts").select("upvotes,downvotes").eq("id", postId).maybeSingle();
      if (count.data) { setUp(count.data.upvotes ?? 0); setDown(count.data.downvotes ?? 0); }
    }
  }

  async function sendReply() {
    const error = validateReplyInput(reply);
    if (error) { setMessage(error); return; }
    if (!user) { router.push(`/login?returnTo=${encodeURIComponent(`/forum/${postId}`)}`); return; }
    setBusy(true);
    const limit = await supabase.rpc("check_forum_rate_limit", { p_action: "reply", p_request_id: makeRequestId() });
    if (limit.error || !(limit.data as { allowed?: boolean } | null)?.allowed) { setMessage("回复过于频繁或服务尚未完成升级。"); setBusy(false); return; }
    const result = await supabase.from("comments").insert({ post_id: postId, user_id: user.id, author: getProfileDisplay(user).name, content: normalizeForumText(reply), status: "published", parent_comment_id: replyTo?.id ?? null }).select("id,post_id,user_id,author,content,created_at,upvotes,downvotes,parent_comment_id").single();
    if (result.error) setMessage(`回复失败：${result.error.message}`);
    else { setComments((items) => [...items, result.data as Comment]); setReply(""); setReplyTo(null); }
    setBusy(false);
  }

  async function savePost() {
    if (!post || !user || post.user_id !== user.id) return;
    const errors = validatePostInput(editTitle, editContent, post.category ?? "");
    if (errors.title || errors.content) { setMessage(errors.title || errors.content || "内容不符合要求。"); return; }
    const result = await supabase.from("posts").update({ title: normalizeForumText(editTitle), content: normalizeForumText(editContent), status: "pending" }).eq("id", post.id).eq("user_id", user.id).select("*").single();
    if (result.error) setMessage(`保存失败：${result.error.message}`);
    else { setPost(result.data as Post); setEditingPost(false); setMessage("帖子已保存，正在重新审核。"); }
  }

  async function saveComment(comment: Comment) {
    const error = validateReplyInput(editComment);
    if (error) { setMessage(error); return; }
    const result = await supabase.from("comments").update({ content: normalizeForumText(editComment) }).eq("id", comment.id).eq("user_id", user?.id ?? "").select("id,post_id,user_id,author,content,created_at,upvotes,downvotes,parent_comment_id").single();
    if (result.error) setMessage(`保存回复失败：${result.error.message}`);
    else { setComments((items) => items.map((item) => item.id === comment.id ? result.data as Comment : item)); setEditingComment(null); }
  }

  async function report(type: "post" | "comment", id: string) {
    if (!user) { router.push(`/login?returnTo=${encodeURIComponent(`/forum/${postId}`)}`); return; }
    const reason = window.prompt("请填写举报原因");
    if (!reason?.trim()) return;
    const result = await supabase.from("content_reports").insert({ reporter_id: user.id, target_type: type, target_id: id, reason: reason.trim() });
    setMessage(result.error ? "举报失败：可能已经举报过该内容。" : "举报已提交，运营会尽快处理。");
  }

  async function accept(commentId: string, value: boolean) {
    if (!user || user.id !== post?.user_id) return;
    const result = await supabase.rpc("accept_forum_reply", { p_post_id: Number(postId), p_comment_id: commentId, p_accept: value });
    if (result.error) setMessage(getSupabaseErrorMessage(result.error.message));
    else { setAccepted(value ? commentId : null); setMessage(value ? "已采纳这条回复。" : "已取消采纳。"); }
  }

  async function deletePost() {
    if (!post || !user || post.user_id !== user.id || !window.confirm("确定删除这个帖子吗？")) return;
    const result = await supabase.from("posts").update({ deleted_at: new Date().toISOString(), status: "unpublished" }).eq("id", post.id).eq("user_id", user.id);
    if (result.error) setMessage(`删除失败：${result.error.message}`); else router.replace("/forum");
  }

  async function clickProduct(link: ProductLink) {
    const result = await supabase.rpc("log_product_click", { p_content_type: "post", p_content_id: postId, p_product_type: link.product_type, p_product_id: link.product_id, p_session_hash: sessionHash() });
    if (result.error) setMessage(result.error.message.includes("product_unavailable") ? "该产品当前不可用。" : "关联产品暂时不可用。");
  }

  if (loading) return <main className="min-h-screen bg-slate-50 p-8 text-slate-600 dark:bg-slate-950 dark:text-slate-300">正在加载帖子...</main>;
  if (!post) return <main className="min-h-screen bg-slate-50 p-8 dark:bg-slate-950"><Link href="/forum" className="text-blue-600">← 返回论坛</Link><p className="mt-8">{message || "帖子不存在或暂时不可见。"}</p></main>;
  const profile = user ? getProfileDisplay(user) : null;
  const isPostOwner = user?.id === post.user_id;
  const caseSections = [["适用场景", post.case_scenario], ["目标", post.case_goal], ["工具与环境", post.case_tools_environment], ["执行步骤", post.case_steps], ["输入示例", post.case_input_example], ["输出示例", post.case_output_example], ["效果说明", post.case_effects], ["限制条件", post.case_limitations]] as const;

  return <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100"><section className="mx-auto max-w-5xl px-5 py-8 sm:px-8"><Link href="/forum" className="text-sm font-medium text-blue-600 hover:text-blue-500">← 返回论坛</Link>
    <article className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-black/20"><div className="border-b border-slate-100 px-6 pb-5 pt-6 dark:border-slate-700/80"><div className="mb-4 flex flex-wrap gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{categoryLabel(post.category) || "综合讨论"}</span>{post.content_type === "case" && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">结构化案例</span>}{post.resolved && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">已解决</span>}{post.is_featured && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">精选</span>}</div>
      {editingPost ? <div className="space-y-3"><input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /><textarea value={editContent} onChange={(event) => setEditContent(event.target.value)} className="min-h-48 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /><button type="button" onClick={() => void savePost()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">保存并重新审核</button></div> : <><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><h1 className="min-w-0 flex-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">{post.title}</h1><div className="flex shrink-0 flex-wrap items-center gap-2">{isPostOwner && <><button type="button" onClick={() => setEditingPost(true)} className={actionClass}>编辑</button><button type="button" onClick={() => void deletePost()} className={dangerActionClass}>删除</button></>}{user && !isPostOwner && <button type="button" onClick={() => void report("post", post.id)} className={actionClass}>举报</button>}</div></div><div className="mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">{(post.author || "社").charAt(0)}</span><span>{post.author || "社区用户"}</span><span>·</span><span>{post.created_at ? new Date(post.created_at).toLocaleString("zh-CN") : ""}</span></div><div className="mt-6 text-slate-700 dark:text-slate-300"><SafeMarkdown content={post.content || "这个帖子还没有正文。"} /></div></>}</div>
      <div className="flex items-center gap-5 px-6 py-4 text-sm text-slate-500 dark:text-slate-400"><button type="button" onClick={() => void vote("up")} className={`rounded-lg px-2 py-1 transition hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 ${myVote === "up" ? "font-semibold text-emerald-600" : ""}`}>👍 {up}</button><button type="button" onClick={() => void vote("down")} className={`rounded-lg px-2 py-1 transition hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 ${myVote === "down" ? "font-semibold text-red-600" : ""}`}>👎 {down}</button><span>💬 {comments.length} 回复</span></div>
    </article>
    {post.content_type === "case" && <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 dark:border-emerald-900/60 dark:bg-emerald-950/20"><h2 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">结构化案例</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">{caseSections.map(([title, value]) => value ? <div key={title}><h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{title}</h3><div className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300"><SafeMarkdown content={value} /></div></div> : null)}</div></section>}
    {links.length > 0 && <section className="mt-6"><h2 className="mb-3 text-lg font-bold">关联 Skill / Agent</h2><div className="grid gap-3 sm:grid-cols-2">{links.map((link) => products[link.id] ? <Link key={link.id} href={products[link.id].href} onClick={() => void clickProduct(link)} className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-400 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900/70"><span className="text-xs text-slate-500">{link.product_type === "skill" ? "Skill" : "Agent"}</span><p className="mt-1 font-medium">{products[link.id].name}</p></Link> : <div key={link.id} className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">关联产品当前不可用</div>)}</div></section>}
    <section className="mt-9"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold tracking-tight">回复 <span className="text-slate-400">({comments.length})</span></h2><span className="text-xs text-slate-500">友善交流，先解决问题</span></div>{post.content_type === "question" && accepted && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">已采纳答案：{comments.find((item) => item.id === accepted)?.author || "回复者"}</div>}
      <div className="space-y-4">{comments.map((comment) => { const isCommentOwner = user?.id === comment.user_id; const parent = comment.parent_comment_id ? comments.find((item) => item.id === comment.parent_comment_id) : null; return <article key={comment.id} className={`rounded-2xl border p-5 shadow-sm shadow-slate-900/5 dark:shadow-black/10 ${comment.parent_comment_id ? "ml-4 border-slate-200/80 sm:ml-8" : ""} ${accepted === comment.id ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/70"}`}><div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold text-slate-800 dark:text-slate-100">{isCommentOwner ? profile?.name : comment.author || "回复者"}</span>{parent && <span className="text-xs text-blue-600 dark:text-blue-300">回复 @{parent.author || "用户"}</span>}<span className="text-xs text-slate-400">{new Date(comment.created_at).toLocaleString("zh-CN")}</span><div className="ml-auto flex flex-wrap items-center gap-2">{isCommentOwner && <><button type="button" onClick={() => { setEditingComment(comment.id); setEditComment(comment.content); }} className={actionClass}>编辑</button><button type="button" onClick={() => void supabase.from("comments").update({ deleted_at: new Date().toISOString(), status: "unpublished" }).eq("id", comment.id).eq("user_id", user.id).then(() => setComments((items) => items.filter((item) => item.id !== comment.id)))} className={dangerActionClass}>删除</button></>}{user && !isCommentOwner && <button type="button" onClick={() => void report("comment", comment.id)} className={actionClass}>举报</button>}</div></div>{editingComment === comment.id ? <div className="mt-3"><textarea value={editComment} onChange={(event) => setEditComment(event.target.value)} className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /><button type="button" onClick={() => void saveComment(comment)} className="mt-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500">保存</button></div> : <div className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-300"><SafeMarkdown content={comment.content} /></div>}<div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-sm dark:border-slate-700"><button type="button" onClick={() => void vote("up", comment.id)} className={`rounded-lg px-2 py-1 transition hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 ${commentVotes[comment.id] === "up" ? "font-semibold text-emerald-600" : "text-slate-500"}`}>👍 {comment.upvotes ?? 0}</button><button type="button" onClick={() => void vote("down", comment.id)} className={`rounded-lg px-2 py-1 transition hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 ${commentVotes[comment.id] === "down" ? "font-semibold text-red-600" : "text-slate-500"}`}>👎 {comment.downvotes ?? 0}</button><button type="button" onClick={() => setReplyTo(comment)} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/40">回复</button>{post.content_type === "question" && isPostOwner && <button type="button" onClick={() => void accept(comment.id, accepted !== comment.id)} className="ml-auto rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40">{accepted === comment.id ? "取消采纳" : "采纳答案"}</button>}</div></article>; })}</div>
      {relatedPosts.length > 0 && <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/70"><div className="flex items-center justify-between"><h2 className="font-bold">同类内容</h2><span className="text-xs text-slate-500">按同分类最新内容推荐</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{relatedPosts.map((item) => <Link key={item.id} href={`/forum/${item.id}`} className="rounded-xl border border-slate-100 px-4 py-3 hover:border-blue-300 hover:bg-blue-50/50 dark:border-slate-800 dark:hover:border-blue-800 dark:hover:bg-blue-950/20"><p className="font-medium">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.author || "社区用户"} · {categoryLabel(item.category)}</p></Link>)}</div></section>}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">{replyTo && <div className="mb-3 flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-950/30 dark:text-blue-200"><span>正在回复 @{replyTo.author || "用户"}</span><button type="button" onClick={() => setReplyTo(null)} className="text-xs underline">取消</button></div>}<textarea value={reply} onChange={(event) => setReply(event.target.value)} maxLength={5000} placeholder={replyTo ? `回复 @${replyTo.author || "用户"}...` : "写回复..."} className="min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500" />{message && <p className="my-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">{message}</p>}<div className="mt-3 flex justify-end"><button type="button" disabled={busy} onClick={() => void sendReply()} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60">{busy ? "发送中..." : "发送回复"}</button></div></div>
    </section>
  </section></main>;
}
