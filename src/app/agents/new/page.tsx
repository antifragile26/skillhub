"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import PublishPageShell, {
  inputClassName,
  labelClassName,
} from "@/components/PublishPageShell";
import { buildAgentPayload } from "@/lib/contentPayloads";
import { supabase } from "@/lib/supabase";
import { agentCategories, agentFrameworks } from "@/lib/agentConstants";

export default function NewAgentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState(agentCategories[0].value);
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [repo, setRepo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleFramework(framework: string) {
    setSelectedFrameworks((current) =>
      current.includes(framework)
        ? current.filter((f) => f !== framework)
        : [...current, framework],
    );
  }

  async function publishAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !description.trim()) {
      setMessage("请填写 Agent 名称和描述。");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.push("/login");
      return;
    }

    let filePath: string | undefined;
    if (file) {
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("packages")
        .upload(`agents/${fileName}`, file, { upsert: false });

      if (uploadError) {
        setMessage(`文件上传失败：${uploadError.message}`);
        setIsSubmitting(false);
        return;
      }
      filePath = `agents/${fileName}`;
    }

    const payload = buildAgentPayload(
      {
        name,
        category,
        frameworks: selectedFrameworks.join(" "),
        description,
        repoUrl: repo,
        filePath,
      },
      data.user.id,
    );
    const { error } = await supabase.from("agents").insert(payload);

    if (error) {
      setMessage(`发布失败：${error.message}`);
      setIsSubmitting(false);
      return;
    }

    router.push("/agents");
  }

  return (
    <PublishPageShell
      title="发布新 Agent"
      description="登记你的 Agent，让社区可以了解它的能力、入口和使用方式。"
    >
      <form className="space-y-6" onSubmit={publishAgent}>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className={labelClassName} htmlFor="agent-name">
              Agent 名称
            </label>
            <input
              id="agent-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClassName}
              placeholder="例如：Research Agent"
            />
          </div>
          <div>
            <label className={labelClassName} htmlFor="agent-category">
              类型
            </label>
            <select
              id="agent-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={inputClassName}
            >
              {agentCategories.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClassName} htmlFor="agent-frameworks">
            支持的框架
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {agentFrameworks.map((fw) => (
              <label
                key={fw}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-zinc-600"
              >
                <input
                  type="checkbox"
                  checked={selectedFrameworks.includes(fw)}
                  onChange={() => toggleFramework(fw)}
                  className="h-4 w-4 rounded border-zinc-400 dark:border-zinc-600"
                />
                <span>{fw}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClassName} htmlFor="agent-repo">
            仓库或运行入口
          </label>
          <input
            id="agent-repo"
            value={repo}
            onChange={(event) => setRepo(event.target.value)}
            className={inputClassName}
            placeholder="https://github.com/yourname/agent 或 https://..."
          />
        </div>

        <div>
          <label className={labelClassName} htmlFor="agent-description">
            Agent 描述
          </label>
          <textarea
            id="agent-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={`${inputClassName} min-h-36 resize-y`}
            placeholder="它能做什么？适合哪些场景？需要哪些环境变量？"
          />
        </div>

        <div>
          <label className={labelClassName} htmlFor="agent-file">
            上传文件包（可选）
          </label>
          <input
            id="agent-file"
            type="file"
            accept=".zip,.md,.json,.txt"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className={inputClassName}
          />
          <p className="mt-1 text-xs text-zinc-500">支持 .zip、.md、.json、.txt 等格式，最大 50MB</p>
        </div>

        {message && <p className="text-sm text-red-600 dark:text-red-400">{message}</p>}

        <div className="flex justify-end gap-4">
          <Link
            href="/agents"
            className="rounded-md border border-zinc-300 px-6 py-3 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            取消
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-green-600 px-8 py-3 font-medium text-white disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? "发布中..." : "发布 Agent"}
          </button>
        </div>
      </form>
    </PublishPageShell>
  );
}
