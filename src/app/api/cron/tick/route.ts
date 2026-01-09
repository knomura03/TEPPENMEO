import { NextResponse } from "next/server";

import { runSchedulerTick } from "@/server/services/jobs/scheduler";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret") ?? "";
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json(
      { ok: false, message: "CRON_SECRET が未設定のため実行できません。" },
      { status: 500 }
    );
  }

  if (secret !== expected) {
    return NextResponse.json(
      { ok: false, message: "認証に失敗しました。" },
      { status: 401 }
    );
  }

  const result = await runSchedulerTick({ now: new Date() });
  const status = result.ok ? 200 : 500;
  return NextResponse.json(result, { status });
}
