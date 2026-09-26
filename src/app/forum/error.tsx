"use client";

export default function ForumError({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <div className="mx-auto max-w-xl p-10"><h2 className="text-xl font-semibold">论坛暂时无法加载</h2><p className="mt-2 text-sm text-zinc-500">请检查网络后重试，输入内容不会因为本页错误而被当作已提交。</p><button type="button" onClick={() => reset()} className="mt-5 rounded-md bg-blue-600 px-4 py-2 text-sm text-white">重试</button></div>; }
