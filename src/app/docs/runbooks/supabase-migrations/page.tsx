import { readFile } from "fs/promises";
import path from "path";

export default async function SupabaseMigrationsRunbookPage() {
  const filePath = path.join(
    process.cwd(),
    "docs/runbooks/supabase-migrations.md"
  );
  let content = "";
  try {
    content = await readFile(filePath, "utf8");
  } catch {
    content =
      "手順書が見つかりませんでした。リポジトリ内の docs/runbooks を確認してください。";
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold">Supabaseマイグレーション</h1>
        <p className="text-sm text-slate-400">
          管理画面の警告を解消するための手順書です。
        </p>
        <pre className="whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-900 p-4 text-xs text-slate-100">
          {content}
        </pre>
      </div>
    </main>
  );
}
