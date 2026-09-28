import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SkillsBrowser, { type SkillListItem } from "@/components/SkillsBrowser";

const PAGE_SIZE = 24;
const FETCH_SIZE = 500;

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
  const skills: SkillListItem[] = [];
  let loadError = false;
  for (let offset = 0; ; offset += FETCH_SIZE) {
    let request = supabase
      .from("skills")
      .select("id,name,version,description,category,downloads,tags,created_at,file_path", { count: "exact" })
      .eq("status", "published")
      .is("deleted_at", null)
      .order("id", { ascending: true });
    if (query) request = request.ilike("name", `%${escapeLike(query)}%`);
    const { data, count, error } = await request.range(offset, offset + FETCH_SIZE - 1);
    if (error) {
      console.error("Skill directory load failed", error.code);
      loadError = true;
      break;
    }
    skills.push(...(data ?? []));
    if (!data?.length || data.length < FETCH_SIZE || (count !== null && skills.length >= count)) break;
  }

  return (
    <main className="hub-page">
      <section className="hub-container py-10 sm:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="hub-kicker">浏览与复用</p><h1 className="hub-page-heading mt-2">Skill 目录</h1><p className="mt-2 hub-muted">查找可复用的技能包，打开作品查看说明、下载与相关讨论。</p></div><Link href="/publish" className="hub-button-primary">发布 Skill</Link></div>
        <form className="hub-surface mb-7 flex flex-wrap gap-3 p-4"><label htmlFor="skill-search" className="sr-only">按名称搜索 Skill</label><input id="skill-search" name="q" defaultValue={query} placeholder="按 Skill 名称搜索" className="hub-input min-w-56 flex-1" /><button className="hub-button-primary">搜索</button>{query && <Link href="/skills" className="hub-button-secondary">清除</Link>}</form>
        {loadError ? <p role="alert" className="hub-surface p-6 text-sm hub-muted">Skill 列表暂时无法加载，请刷新页面重试。</p> : <SkillsBrowser skills={skills} initialPage={page} pageSize={PAGE_SIZE} isSearch={!!query} />}
      </section>
    </main>
  );
}
