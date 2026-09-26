"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const suggestions = ["SkillHub 能做什么？", "如何发布和分享 Skill？", "帮我整理一条 Skill 使用经验"];

const welcomeMessage: ChatMessage = {
  role: "assistant",
  content: "你好！我是 SkillHub 助手，可以帮你了解站内功能、整理 Skill 使用经验或改进技能说明。",
};

export default function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    inputRef.current?.focus();
  }, [open, messages, pending]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function sendMessage(event?: FormEvent<HTMLFormElement>, suggestedText?: string) {
    event?.preventDefault();
    const content = (suggestedText ?? input).trim();
    if (!content || pending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(-12).filter((message) => message !== welcomeMessage) }),
      });
      const result = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok) {
        if (response.status === 401) throw new Error("请先登录，再使用 AI 助手。");
        throw new Error(result.error || "暂时无法回复，请稍后重试。");
      }
      if (!result.reply) throw new Error("助手没有返回内容，请重试。");
      setMessages((current) => [...current, { role: "assistant", content: result.reply! }]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "发送失败，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 sm:bottom-7 sm:right-7">
      {open && (
        <section
          aria-label="SkillHub AI 聊天助手"
          className="flex h-[min(620px,calc(100dvh-7rem))] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-white dark:border-slate-700">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-lg" aria-hidden="true">✦</span>
              <div>
                <h2 className="text-sm font-semibold">SkillHub AI 助手</h2>
                <p className="mt-0.5 text-xs text-blue-100">技能交流与案例整理搭档</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => { setMessages([welcomeMessage]); setError(""); }}
                disabled={pending}
                aria-label="开始新对话"
                title="开始新对话"
                className="rounded-lg p-2 text-white/90 transition hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true"><path d="M3.5 8a6.5 6.5 0 1 1 .8 5.4M3.5 8V3.8M3.5 8h4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭聊天助手"
                className="rounded-lg p-2 text-white/90 transition hover:bg-white/15 hover:text-white"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/80 p-4 dark:bg-slate-950/50" aria-live="polite">
            <p className="mx-auto max-w-[290px] text-center text-[11px] leading-5 text-slate-500 dark:text-slate-400">
              助手目前不会自动检索论坛或知识库内容；请勿发送密码、密钥等敏感信息。
            </p>
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${message.role === "user" ? "rounded-br-md bg-blue-600 text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
                  {message.content}
                </div>
              </div>
            ))}
            {messages.length === 1 && !pending && (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void sendMessage(undefined, suggestion)}
                    className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs text-blue-700 transition hover:border-blue-400 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300 dark:hover:border-blue-500"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            {pending && <p className="text-xs text-slate-500 dark:text-slate-400">助手正在整理思路…</p>}
            <div ref={endRef} />
          </div>

          <div className="border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            {error && <p role="alert" className="mb-2 px-1 text-xs leading-5 text-rose-600 dark:text-rose-400">{error}</p>}
            <form onSubmit={(event) => void sendMessage(event)} className="flex items-end gap-2">
              <label htmlFor="skillhub-assistant-input" className="sr-only">输入消息</label>
              <input
                ref={inputRef}
                id="skillhub-assistant-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                maxLength={2000}
                placeholder="问问 SkillHub 助手…"
                disabled={pending}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-950"
              />
              <button
                type="submit"
                disabled={pending || !input.trim()}
                aria-label="发送消息"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true"><path d="m3.5 9.2 12.2-5.1c.6-.2 1.1.3.9.9l-5.1 12.2c-.2.6-1 .6-1.2 0l-1.6-5.2-5.2-1.6c-.6-.2-.6-1 0-1.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="m8.7 12.2 4.1-4.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </form>
          </div>
        </section>
      )}

      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "关闭 AI 助手" : "打开 AI 助手"}
        onClick={() => setOpen((current) => !current)}
        className="group flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        <span aria-hidden="true" className="text-base">✦</span>
        <span>AI 助手</span>
      </button>
    </div>
  );
}
