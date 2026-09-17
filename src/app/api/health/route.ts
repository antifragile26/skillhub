import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let supabaseProject = "unknown";

  if (supabaseUrl) {
    try {
      supabaseProject = new URL(supabaseUrl).hostname.split(".")[0] || "unknown";
    } catch {
      supabaseProject = "invalid-url";
    }
  }

  return NextResponse.json({
    ok: true,
    commit: process.env.DEPLOY_COMMIT_SHA ?? "unknown",
    deployedAt: process.env.DEPLOYED_AT ?? null,
    supabaseProject,
  });
}
