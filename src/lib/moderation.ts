export type AutomatedReviewStatus = "not_run" | "clean" | "flagged";

export const automatedReviewLabels: Record<string, string> = {
  high_risk_term: "高风险词",
  contact_exchange: "联系方式引流",
  external_link: "外部链接",
  overlong: "内容过长",
  repeated_text: "重复刷屏",
};

export function automatedReviewLabel(value: string) {
  return automatedReviewLabels[value] ?? value;
}

export function automatedReviewSummary(status: AutomatedReviewStatus, score: number) {
  if (status === "clean") return `自动审核通过（风险分 ${score}）`;
  if (status === "flagged") return `已转人工审核（风险分 ${score}）`;
  return "等待自动审核";
}
