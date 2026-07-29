"use client";

import { useState } from "react";
import Link from "next/link";

export default function CreateMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-white"
        title="创建"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-zinc-300 bg-white py-2 shadow-2xl dark:border-zinc-700 dark:bg-[#18181b]">
            <Link
              href="/publish"
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <span>📦</span>
              <span>发布 Skill</span>
            </Link>
            <Link
              href="/agents/new"
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <span>🤖</span>
              <span>发布 Agent</span>
            </Link>
            <Link
              href="/forum/new"
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <span>✍️</span>
              <span>发帖</span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
