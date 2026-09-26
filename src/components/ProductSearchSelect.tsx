"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type ProductType = "skill";
export type ProductSelection = { type: ProductType; id: string; name: string; description?: string | null };

function escapeLike(value: string) {
  return value.replace(/[\\%_,()]/g, " ").trim().slice(0, 80);
}

export default function ProductSearchSelect({
  selected,
  onSelect,
  onClear,
}: {
  selected: ProductSelection | null;
  onSelect: (product: ProductSelection) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const term = escapeLike(query);
    if (selected || term.length < 2) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      setSearched(true);
      const pattern = `%${term}%`;
      const skills = await supabase.from("skills").select("id,name,description").eq("status", "published").ilike("name", pattern).order("name").limit(12);
      if (!active) return;
      const found: ProductSelection[] = (skills.data ?? []).map((item) => ({ type: "skill", id: String(item.id), name: item.name, description: item.description }));
      setResults(found.slice(0, 12));
      setError(skills.error ? "Skill 搜索失败，请检查网络后重试。" : "");
      setLoading(false);
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, selected, retryCount]);

  return <div className="space-y-2">
    {selected ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-900/60 dark:bg-blue-950/20">
      <div className="min-w-0"><span className="mr-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">Skill</span><span className="font-medium">{selected.name}</span>{selected.description && <p className="mt-1 truncate text-xs text-zinc-500">{selected.description}</p>}</div>
      <button type="button" onClick={onClear} className="shrink-0 text-sm text-blue-700 hover:underline dark:text-blue-300">移除</button>
    </div> : <>
      <label htmlFor="product-search" className="sr-only">搜索要关联的 Skill</label>
      <input id="product-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setResults([]); setLoading(false); setError(""); setSearched(false); }} autoComplete="off" placeholder="搜索 Skill 名称（至少输入 2 个字）" className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" />
      {loading && <p role="status" className="text-sm text-zinc-500">正在搜索 Skills...</p>}
      {!loading && error && <p role="alert" className="text-sm text-red-600">{error} <button type="button" onClick={() => setRetryCount((value) => value + 1)} className="underline">重新搜索</button></p>}
      {!loading && searched && !error && results.length === 0 && <p className="text-sm text-zinc-500">没有找到 Skill，可以检查名称后重试。</p>}
      {!loading && !selected && escapeLike(query).length >= 2 && results.length > 0 && <ul className="max-h-64 overflow-y-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950" aria-label="Skill 搜索结果">{results.map((product) => <li key={product.id}><button type="button" onClick={() => { onSelect(product); setQuery(""); setResults([]); setLoading(false); setError(""); setSearched(false); }} className="w-full border-b border-zinc-100 px-3 py-2 text-left last:border-b-0 hover:bg-blue-50 dark:border-zinc-800 dark:hover:bg-blue-950/30"><span className="mr-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">Skill</span><span className="font-medium">{product.name}</span>{product.description && <span className="ml-2 text-xs text-zinc-500">{product.description.slice(0, 100)}</span>}</button></li>)}</ul>}
    </>}
  </div>;
}
