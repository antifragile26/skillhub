import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SkillsBrowser from "@/components/SkillsBrowser";

const PAGE_SIZE = 24;

function escapeLike(value: string) {
  return value.replace(/[%,_]/g, "\\$&").replace(/[(),]/g, " ");
}

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  let request = supabase
    .from("skills")
    .select("id,name,version,description,category,downloads,tags,created_at", { count: "exact" })
    .eq("status", "published")
    .order("downloads", { ascending: false })
    .order("created_at", { ascending: false });
  if (query) request = request.ilike("name", `%${escapeLike(query)}%`);
  const { data: skills, count } = await request.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const querySuffix = new URLSearchParams();
  if (query) querySuffix.set("q", query);
  const hrefForPage = (nextPage: number) => {
    const next = new URLSearchParams(querySuffix);
    next.set("page", String(nextPage));
    return `/skills?${next.toString()}`;
  };

  return (
    <main className="hub-page">
      <section className="hub-container py-10 sm:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="hub-kicker">浏览与复用</p><h1 className="hub-page-heading mt-2">Skill 目录</h1><p className="mt-2 hub-muted">查找可复用的技能包，打开作品查看说明、下载与相关讨论。</p></div><Link href="/publish" className="hub-button-primary">发布 Skill</Link></div>
        <form className="hub-surface mb-7 flex flex-wrap gap-3 p-4"><label htmlFor="skill-search" className="sr-only">按名称搜索 Skill</label><input id="skill-search" name="q" defaultValue={query} placeholder="按 Skill 名称搜索" className="hub-input min-w-56 flex-1" /><button className="hub-button-primary">搜索</button>{query && <Link href="/skills" className="hub-button-secondary">清除</Link>}</form>
        <SkillsBrowser skills={skills ?? []} />
        <div className="mt-8 flex items-center justify-between gap-3 text-sm hub-muted"><span>共 {count ?? 0} 个已发布 Skill · 第 {page} / {pageCount} 页</span><div className="flex gap-2">{page > 1 && <Link href={hrefForPage(page - 1)} className="hub-button-secondary">上一页</Link>}{page < pageCount && <Link href={hrefForPage(page + 1)} className="hub-button-secondary">下一页</Link>}</div></div>
      </section>
    </main>
  );
}
