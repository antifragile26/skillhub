import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default async function Home() {
  const [{ data: skills }, { count: skillCount }, { count: postCount }] = await Promise.all([
    supabase.from("skills").select("id,name,version,description,category,downloads,tags").eq("status", "published").order("downloads", { ascending: false }).limit(1),
    supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("posts").select("id", { count: "exact", head: true }).is("deleted_at", null),
  ]);
  const featured = skills?.[0];
  return <main className="hub-page">
    <section className="home-hero">
      <div className="hub-container home-hero-layout">
        <div>
          <p className="hub-kicker">Skills 分享与交流社区</p>
          <h1 className="home-hero-title">发现能用的 Skill，<br />分享真实使用经验。</h1>
          <p className="home-hero-copy">浏览可复用的技能包，查看说明与获取方式；遇到问题时，在论坛提问，也可以关联对应 Skill。</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/skills" className="hub-button-primary">探索 Skills <span aria-hidden="true">→</span></Link>
            <Link href="/forum" className="hub-button-secondary">浏览社区讨论</Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-7 gap-y-2 text-sm hub-muted">
            <span><strong className="mr-1 text-[var(--foreground)]">{skillCount ?? 0}</strong> Skills</span>
            <span><strong className="mr-1 text-[var(--foreground)]">{postCount ?? 0}</strong> 讨论</span>
          </div>
        </div>
        <div className="home-feature">
          <div className="home-feature-rule" />
          <p className="mt-4 hub-kicker">精选 Skill</p>
          {featured ? <>
            <Link href={`/skills/${featured.id}`} className="mt-3 block text-xl font-semibold tracking-tight hover:text-[var(--accent-strong)]">{featured.name}<span className="ml-2 text-sm font-normal hub-muted">v{featured.version ?? "0.1.0"}</span></Link>
            <p className="mt-3 line-clamp-3 text-sm leading-6 hub-muted">{featured.description || "查看作品说明、获取方式，以及使用者分享的经验。"}</p>
            <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4 text-xs hub-muted"><span>下载 {featured.downloads ?? 0}</span><Link href={`/skills/${featured.id}`} className="font-semibold text-[var(--accent-strong)]">查看 Skill →</Link></div>
          </> : <><h2 className="mt-3 text-xl font-semibold">从一个 Skill 开始</h2><p className="mt-3 text-sm leading-6 hub-muted">浏览社区分享的技能，或发布你的第一个 Skill。</p><Link href="/publish" className="mt-5 inline-flex text-sm font-semibold text-[var(--accent-strong)]">发布 Skill →</Link></>}
        </div>
      </div>
    </section>
    <section className="hub-container home-section">
      <div className="grid gap-4 md:grid-cols-2">
        {[{ href: "/skills", eyebrow: "可复用的能力", title: "探索 Skills", copy: "按名称和用途查找技能包，打开详情查看说明与下载方式。" }, { href: "/forum", eyebrow: "围绕 Skills 交流", title: "进入论坛", copy: "提问、反馈使用问题，或分享实践经验。" }].map((item) => <Link key={item.href} href={item.href} className="hub-surface group p-5 transition hover:-translate-y-0.5 hover:border-[var(--accent)]">
          <span className="hub-kicker">{item.eyebrow}</span><h2 className="mt-3 text-lg font-semibold tracking-tight group-hover:text-[var(--accent-strong)]">{item.title}<span className="ml-2 text-sm">↗</span></h2><p className="mt-2 text-sm leading-6 hub-muted">{item.copy}</p>
        </Link>)}
      </div>
    </section>
  </main>;
}
