"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";
import PublishPageShell, { inputClassName, labelClassName } from "@/components/PublishPageShell";
import { buildSkillPayload } from "@/lib/contentPayloads";
import { inspectSkillPackage, MAX_SKILL_PACKAGE_BYTES, type SkillPackageManifest } from "@/lib/skillPackage";
import { recommendSkillCategory, skillCategoryDefinitions, type SkillCategoryValue } from "@/lib/skillCategories";
import { supabase } from "@/lib/supabase";

type UploadResult = {
  filePath: string;
  storageBucket: "skill-packages";
  packageName: string;
  packageSize: number;
  manifest: SkillPackageManifest;
  error?: string;
};

export default function PublishPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [version, setVersion] = useState("0.1.0");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<SkillCategoryValue>("general-tools");
  const [license, setLicense] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [manifest, setManifest] = useState<SkillPackageManifest | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState("");
  const [isInspecting, setIsInspecting] = useState(false);

  async function selectPackage(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(null);
    setManifest(null);
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith(".zip")) {
      event.target.value = "";
      setMessage("为确保能安全校验内容，目前只支持 .zip 格式的技能包。");
      return;
    }
    setFile(nextFile);
    setMessage("已选择 ZIP 技能包，请点击“读取 ZIP 信息”自动填写 Skill 信息。");
  }

  async function inspectSelectedPackage() {
    if (!file) {
      setMessage("请先选择 ZIP 技能包。");
      return;
    }
    setIsInspecting(true);
    setMessage("");
    try {
      const nextManifest = inspectSkillPackage(await file.arrayBuffer());
      setManifest(nextManifest);
      setName((current) => current || nextManifest.name || "");
      setDescription((current) => current || nextManifest.description || "");
      setCategory(recommendSkillCategory(nextManifest.name || "", nextManifest.description || ""));
      setLicense((current) => current || nextManifest.license || "");
      setMessage("已读取 SKILL.md，名称、简介和推荐分类已填入；提交前可以继续修改。");
    } catch (error) {
      setFile(null);
      setMessage(error instanceof Error ? error.message : "技能包校验失败。");
    } finally {
      setIsInspecting(false);
    }
  }

  async function publishSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !description.trim() || !file || !manifest) {
      setMessage(!manifest ? "请先选择 ZIP 技能包并点击“读取 ZIP 信息”，确认名称、简介和分类后再提交。" : "请填写 Skill 名称和描述，并上传包含 SKILL.md 的 ZIP 技能包。");
      return;
    }
    setIsSubmitting(true);
    setMessage("");

    try {
      setSubmissionStep("正在确认登录状态…");
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(`登录状态检查失败：${authError.message}`);
      if (!data.user) {
        router.push("/login?returnTo=%2Fpublish");
        return;
      }

      setSubmissionStep("正在上传并校验技能包…");
      const uploadForm = new FormData();
      uploadForm.set("package", file);
      const uploadResponse = await fetch("/api/skills/upload", {
        method: "POST",
        body: uploadForm,
        signal: AbortSignal.timeout(30000),
      });
      const upload = await uploadResponse.json().catch(() => null) as UploadResult | null;
      if (!uploadResponse.ok || !upload || upload.error) throw new Error(upload?.error || `文件上传失败（HTTP ${uploadResponse.status}）。`);

      setSubmissionStep("正在保存 Skill 信息…");
      const { data: insertedSkill, error: insertError } = await supabase
        .from("skills")
        .insert(buildSkillPayload({
          name, version, description, category, repoUrl,
          filePath: upload.filePath, storageBucket: upload.storageBucket,
          readme: upload.manifest.readme, license,
          packageName: upload.packageName, packageSize: upload.packageSize,
          packageManifest: { fileCount: upload.manifest.fileCount, unpackedBytes: upload.manifest.unpackedBytes },
        }, data.user.id))
        .select("id")
        .single();
      if (insertError || !insertedSkill) {
        await supabase.storage.from("skill-packages").remove([upload.filePath]);
        throw new Error(insertError?.message || "Skill 草稿创建失败。");
      }

      setSubmissionStep("正在提交审核…");
      const { error: submitError } = await supabase.rpc("submit_skill_for_review", { p_skill_id: insertedSkill.id }).abortSignal(AbortSignal.timeout(20000));
      if (submitError) {
        setMessage(`草稿已保存，但提交审核失败：${submitError.message}`);
        router.push(`/my-skills?draft=${insertedSkill.id}`);
        return;
      }
      router.push("/my-skills?submitted=1");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "未知错误";
      const timedOut = /abort|timeout/i.test(detail);
      setMessage(timedOut
        ? "操作超时了，请检查网络后重试。若已跳转到“我的 Skills”，请先查看状态，避免重复提交。"
        : `发布失败：${detail}`);
    } finally {
      setIsSubmitting(false);
      setSubmissionStep("");
    }
  }

  return (
    <PublishPageShell title="发布新 Skill" description="上传可验证的 ZIP 技能包。提交后先进入审核，发布前不会对外暴露文件。">
      <form className="space-y-8" onSubmit={publishSkill}>
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-100">
          <p className="font-semibold">安全发布要求</p>
          <p className="mt-1 text-blue-800 dark:text-blue-200">ZIP 根目录必须包含 SKILL.md。系统会检查路径安全、文件数量、解压大小和说明文件，但不会执行包内任何内容。</p>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <div><label className={labelClassName} htmlFor="skill-name">Skill 名称</label><input id="skill-name" value={name} onChange={(event) => setName(event.target.value)} className={inputClassName} placeholder="例如：browser-control" /></div>
          <div><label className={labelClassName} htmlFor="skill-version">版本</label><input id="skill-version" value={version} onChange={(event) => setVersion(event.target.value)} className={inputClassName} placeholder="0.1.0" /></div>
        </div>

        <div><label className={labelClassName} htmlFor="skill-description">简介</label><textarea id="skill-description" value={description} onChange={(event) => setDescription(event.target.value)} className={`${inputClassName} min-h-32 resize-y`} placeholder="说明它能解决什么问题、适合什么场景。" /></div>

        <div><label className={labelClassName} htmlFor="skill-category">推荐分类（可修改）</label><select id="skill-category" value={category} onChange={(event) => setCategory(event.target.value as SkillCategoryValue)} className={inputClassName}>{skillCategoryDefinitions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><p className="mt-1 text-xs text-zinc-500">上传 ZIP 后会根据 SKILL.md 的名称和简介推荐一个分类；提交前可以自行修改确认。</p></div>

        <div className="grid gap-6 md:grid-cols-2">
          <div><label className={labelClassName} htmlFor="skill-license">许可证（可选）</label><input id="skill-license" value={license} onChange={(event) => setLicense(event.target.value)} className={inputClassName} placeholder="例如：MIT；不确定可以留空" /><p className="mt-1 text-xs text-zinc-500">MIT 是常见的开源许可证；不确定授权方式时可以暂不填写。</p></div>
          <div><label className={labelClassName} htmlFor="skill-repo">源码仓库（可选）</label><input id="skill-repo" type="url" value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} className={inputClassName} placeholder="https://github.com/yourname/skill" /></div>
        </div>

        <div>
          <label className={labelClassName} htmlFor="skill-file">上传技能包 <span className="text-red-500">*</span></label>
          <input id="skill-file" type="file" accept=".zip,application/zip" onChange={selectPackage} className={inputClassName} />
          <p className="mt-2 text-xs text-zinc-500">选择 ZIP 后，点击下方按钮读取其中的 SKILL.md。系统会自动填写名称、简介并推荐分类；你可以修改确认。仅 ZIP，最大 {(MAX_SKILL_PACKAGE_BYTES / 1024 / 1024).toFixed(0)} MB；解压后最大 20 MB，最多 200 个文件。</p>
          <button type="button" onClick={inspectSelectedPackage} disabled={!file || isInspecting} className="mt-3 rounded-md border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200 dark:hover:bg-blue-950/60">{isInspecting ? "读取中..." : "读取 ZIP 信息"}</button>
          {manifest && <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">已读取 SKILL.md · {manifest.fileCount} 个文件 · 解压后 {(manifest.unpackedBytes / 1024).toFixed(1)} KB</p>}
        </div>

        {message && <p role="status" aria-live="polite" className={message.startsWith("已") ? "text-sm text-emerald-600 dark:text-emerald-400" : "text-sm text-red-600 dark:text-red-400"}>{message}</p>}

        <div className="flex justify-end gap-4"><Link href="/skills" className="rounded-md border border-zinc-300 px-6 py-3 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900">取消</Link><button type="submit" disabled={isSubmitting || isInspecting} className="rounded-md bg-blue-600 px-8 py-3 font-medium text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60">{isSubmitting ? submissionStep || "提交中…" : "提交审核"}</button></div>
      </form>
    </PublishPageShell>
  );
}
