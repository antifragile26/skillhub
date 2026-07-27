"use client"; // 有互动，需要客户端

import { useState } from "react";

export default function CreateMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* 加号按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 hover:text-white"
        title="创建"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉菜单（点了才显示） */}
      {isOpen && (
        <>
          {/* 点外面关闭菜单的透明遮罩 */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* 菜单本体 */}
          <div className="absolute right-0 mt-2 w-48 rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg z-20">
            <a
              href="/publish"
              className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-zinc-800 rounded-t-lg"
            >
              <span>📦</span>
              <span>发布 Skill</span>
            </a>
            <a
              href="/agents/new"
              className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-zinc-800"
            >
              <span>🤖</span>
              <span>发布 Agent</span>
            </a>
            <a
              href="/forum/new"
              className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-zinc-800 rounded-b-lg"
            >
              <span>✍️</span>
              <span>发帖</span>
            </a>
          </div>
        </>
      )}
    </div>
  );
}
