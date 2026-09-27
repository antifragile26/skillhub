import type { SupabaseClient } from "@supabase/supabase-js";

export type AssistantSourceType = "skill" | "post" | "knowledge" | "collection";

export type AssistantSource = {
  type: AssistantSourceType;
  id: string;
  title: string;
  excerpt: string;
  href: string;
};

type SearchRow = Record<string, unknown>;
type RankedSource = { source: AssistantSource; score: number; searchableText: string };

const sourceLabels: Record<AssistantSourceType, string> = {
  skill: "Skill",
  post: "论坛帖子",
  knowledge: "知识文章",
  collection: "专题",
};

export const assistantBrowseLinks = [
  { label: "Skills", href: "/skills" },
  { label: "论坛", href: "/forum" },
  { label: "知识库", href: "/knowledge" },
  { label: "专题", href: "/collections" },
] as const;

function normalizeSearchTerms(values: string[]) {
  return [...new Set(values
    .map((value) => value.normalize("NFKC").replace(/[\\%_(),.*:"'`]/g, " ").replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80))
    .filter((value) => value.length >= 2))].slice(0, 4);
}

function orFilter(columns: string[], terms: string[]) {
  return columns.flatMap((column) => terms.map((term) => `${column}.ilike.%${term}%`)).join(",");
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function excerpt(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > 220 ? `${clean.slice(0, 220)}…` : clean;
}

function makeRankedSource(
  type: AssistantSourceType,
  id: unknown,
  titleValue: unknown,
  excerptValue: string,
  searchableParts: string[],
  terms: string[],
): RankedSource {
  const safeId = String(id);
  const title = text(titleValue).trim() || sourceLabels[type];
  const searchableText = searchableParts.join(" ").toLocaleLowerCase();
  const lowerTitle = title.toLocaleLowerCase();
  const score = terms.reduce((total, term) => {
    const normalized = term.toLocaleLowerCase();
    if (lowerTitle.includes(normalized)) return total + 5;
    return total + (searchableText.includes(normalized) ? 2 : 0);
  }, 0);
  const basePath = type === "skill" ? "skills" : type === "post" ? "forum" : type === "knowledge" ? "knowledge" : "collections";
  return {
    source: { type, id: safeId, title, excerpt: excerpt(excerptValue), href: `/${basePath}/${encodeURIComponent(safeId)}` },
    score,
    searchableText,
  };
}

function throwIfSearchFailed(name: string, error: { code?: string; message?: string } | null) {
  if (!error) return;
  console.error("SkillHub assistant search failed", name, error.code || "unknown");
  throw new Error("assistant_content_search_unavailable");
}

export async function searchAssistantContent(client: SupabaseClient, rawTerms: string[]): Promise<AssistantSource[]> {
  const terms = normalizeSearchTerms(rawTerms);
  if (terms.length === 0) return [];

  const [skillsResult, skillTagsResult, postsResult, knowledgeResult, knowledgeTagsResult, collectionsResult] = await Promise.all([
    client.from("skills").select("id,name,description,category,tags").eq("status", "published").is("deleted_at", null).or(orFilter(["name", "description", "category"], terms)).limit(50),
    client.from("skills").select("id,name,description,category,tags").eq("status", "published").is("deleted_at", null).overlaps("tags", terms).limit(50),
    client.from("posts").select("id,title,content,category,content_type,is_featured").eq("status", "published").is("deleted_at", null).or(orFilter(["title", "content", "category"], terms)).limit(50),
    client.from("knowledge_entries").select("id,title,summary,scenario,steps,conclusions,limitations,tags,needs_review").eq("status", "published").is("deleted_at", null).or(orFilter(["title", "summary", "scenario", "steps", "conclusions", "limitations"], terms)).limit(50),
    client.from("knowledge_entries").select("id,title,summary,scenario,steps,conclusions,limitations,tags,needs_review").eq("status", "published").is("deleted_at", null).overlaps("tags", terms).limit(50),
    client.from("knowledge_collections").select("id,name,description").eq("status", "published").or(orFilter(["name", "description"], terms)).limit(50),
  ]);

  throwIfSearchFailed("skills", skillsResult.error);
  throwIfSearchFailed("skill_tags", skillTagsResult.error);
  throwIfSearchFailed("posts", postsResult.error);
  throwIfSearchFailed("knowledge", knowledgeResult.error);
  throwIfSearchFailed("knowledge_tags", knowledgeTagsResult.error);
  throwIfSearchFailed("collections", collectionsResult.error);

  const skillRows = [...(skillsResult.data ?? []), ...(skillTagsResult.data ?? [])] as SearchRow[];
  const uniqueSkills = [...new Map(skillRows.map((row) => [String(row.id), row])).values()];
  const knowledgeRows = [...(knowledgeResult.data ?? []), ...(knowledgeTagsResult.data ?? [])] as SearchRow[];
  const uniqueKnowledge = [...new Map(knowledgeRows.map((row) => [String(row.id), row])).values()];

  const ranked: RankedSource[] = [];
  for (const row of uniqueSkills) {
    const tags = Array.isArray(row.tags) ? row.tags.map(String) : [];
    ranked.push(makeRankedSource("skill", row.id, row.name, text(row.description), [text(row.name), text(row.description), text(row.category), ...tags], terms));
  }
  for (const row of (postsResult.data ?? []) as SearchRow[]) {
    const body = text(row.content);
    ranked.push(makeRankedSource("post", row.id, row.title, body, [text(row.title), body, text(row.category)], terms));
  }
  for (const row of uniqueKnowledge) {
    const tags = Array.isArray(row.tags) ? row.tags.map(String) : [];
    const parts = [text(row.summary), text(row.scenario), text(row.steps), text(row.conclusions), text(row.limitations), ...tags];
    const reviewNote = row.needs_review === true ? "来源待核对。 " : "";
    const matchingPart = parts.find((part) => terms.some((term) => part.toLocaleLowerCase().includes(term.toLocaleLowerCase())));
    ranked.push(makeRankedSource("knowledge", row.id, row.title, `${reviewNote}${matchingPart || text(row.summary) || text(row.scenario)}`, [text(row.title), ...parts], terms));
  }

  const collectionRows = new Map<string, SearchRow>();
  for (const row of (collectionsResult.data ?? []) as SearchRow[]) collectionRows.set(String(row.id), row);

  const knowledgeIds = uniqueKnowledge.map((row) => String(row.id)).slice(0, 24);
  if (knowledgeIds.length > 0) {
    const itemsResult = await client.from("knowledge_collection_items").select("collection_id,knowledge_id").in("knowledge_id", knowledgeIds).limit(100);
    throwIfSearchFailed("collection_items", itemsResult.error);
    const relatedCollectionIds = [...new Set(((itemsResult.data ?? []) as SearchRow[]).map((row) => String(row.collection_id)))];
    if (relatedCollectionIds.length > 0) {
      const relatedCollections = await client.from("knowledge_collections").select("id,name,description").in("id", relatedCollectionIds).eq("status", "published").limit(12);
      throwIfSearchFailed("related_collections", relatedCollections.error);
      for (const row of (relatedCollections.data ?? []) as SearchRow[]) collectionRows.set(String(row.id), row);
    }
  }

  for (const row of collectionRows.values()) {
    ranked.push(makeRankedSource("collection", row.id, row.name, text(row.description), [text(row.name), text(row.description)], terms));
  }

  const perTypeCount = new Map<AssistantSourceType, number>();
  const selected: AssistantSource[] = [];
  for (const item of ranked.sort((left, right) => right.score - left.score || left.source.title.localeCompare(right.source.title, "zh-CN"))) {
    const count = perTypeCount.get(item.source.type) ?? 0;
    if (count >= 3) continue;
    perTypeCount.set(item.source.type, count + 1);
    selected.push(item.source);
    if (selected.length >= 10) break;
  }
  return selected;
}
