"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import PublishPageShell, {
  inputClassName,
  labelClassName,
} from "@/components/PublishPageShell";
import { buildSkillPayload } from "@/lib/contentPayloads";
import { supabase } from "@/lib/supabase";

export default function PublishPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [version, setVersion] = useState("0.1.0");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function publishSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !description.trim()) {
      setMessage("请填写 Skill 名称和描述。");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.push("/login");
      return;
    }

    const { error } = await supabase
      .from("skills")
      .insert(buildSkillPayload({ name, version, description, tags }, data.user.id));

    if (error) {
      setMessage(`发布失败：${error.message}`);
      setIsSubmitting(false);
      return;
    }

    router.push("/skills");
  }

  return (
    <PublishPageShell
      title="发布新 Skill"
      description="推荐通过 CLI 发布，也可以先从网页登记 Skill 信息。"
    >
      <form className="space-y-10" onSubmit={publishSkill}>
        <section className="rounded-lg border border-zinc-300 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-[#0f141c]">
          <p className="mb-4 font-mono text-sm text-zinc-500 dark:text-zinc-400">
            # CLI 发布（推荐）
          </p>
          <pre className="overflow-x-auto font-mono text-base leading-7 text-green-600 dark:text-green-400">
            <code>{"skillhub login --api-key sk_live_xxx\nskillhub publish"}</code>
          </pre>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className={labelClassName} htmlFor="skill-name">
              Skill 名称
            </label>
            <input
              id="skill-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClassName}
              placeholder="例如：browser-control"
            />
          </div>
          <div>
            <label className={labelClassName} htmlFor="skill-version">
              版本
            </label>
            <input
              id="skill-version"
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              className={inputClassName}
              placeholder="0.1.0"
            />
          </div>
        </div>

        <div>
          <label className={labelClassName} htmlFor="skill-description">
            Skill 描述
          </label>
          <textarea
            id="skill-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={`${inputClassName} min-h-32 resize-y`}
            placeholder="说明这个 Skill 能解决什么问题、适合什么场景。"
          />
        </div>

        <div>
          <label className={labelClassName} htmlFor="skill-tags">
            标签
          </label>
          <input
            id="skill-tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            className={inputClassName}
            placeholder="用空格或逗号分隔，例如：browser automation cli"
          />
        </div>

        {message && <p className="text-sm text-red-600 dark:text-red-400">{message}</p>}

        <div className="flex justify-end gap-4">
          <Link
            href="/"
            className="rounded-md border border-zinc-300 px-6 py-3 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            取消
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-green-600 px-8 py-3 font-medium text-white disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? "发布中..." : "发布 Skill"}
          </button>
        </div>
      </form>
    </PublishPageShell>
  );
}
