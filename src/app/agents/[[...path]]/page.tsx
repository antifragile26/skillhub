import Link from "next/link";

export default async function RetiredAgentsPage({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const isLegacyDetail = Boolean(path?.length);

  return <main className="hub-page">
    <section className="hub-container max-w-3xl py-16 sm:py-24">
      <div className="hub-surface p-7 sm:p-10">
        <p className="hub-kicker">SkillHub 产品调整</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Agent 作品已停止展示</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 hub-muted">
          {isLegacyDetail
            ? "这个 Agent 作品页面已下线。历史帖子和回复仍会保留，旧关联会明确标记为停止展示。"
            : "SkillHub 目前专注于 Skills 的分享与交流。历史内容仍会保留，你可以继续发现 Skills 或参与论坛讨论。"}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/skills" className="hub-button-primary">发现 Skills</Link>
          <Link href="/forum" className="hub-button-secondary">进入论坛</Link>
        </div>
      </div>
    </section>
  </main>;
}
