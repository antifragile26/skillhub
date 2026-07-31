import { Fragment, type ReactNode } from "react";

// 匹配 http(s) 链接
const urlPattern = /(https?:\/\/[^\s]+)/g;

// 从一段文本里取第一个链接（找不到返回 null）
export function extractFirstUrl(text?: string | null): string | null {
  if (!text) return null;
  const match = text.match(urlPattern);
  return match ? match[0] : null;
}

// 把文本里的链接渲染成可点击的 <a>，其余部分原样显示
export function linkifyText(text?: string | null): ReactNode {
  if (!text) return null;
  const parts = text.split(urlPattern);
  return parts.map((part, index) => {
    if (urlPattern.test(part)) {
      // split 会保留分隔符（链接本身），这里把它渲染成链接
      urlPattern.lastIndex = 0; // 重置全局正则状态
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-500 dark:text-blue-400 break-all"
        >
          {part}
        </a>
      );
    }
    urlPattern.lastIndex = 0;
    return <Fragment key={index}>{part}</Fragment>;
  });
}
