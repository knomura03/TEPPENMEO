import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[color:var(--primary)] via-slate-900 to-slate-800">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-10 px-6 py-12 md:flex-row">
        <div className="max-w-md text-slate-100">
          <img src="/logo.svg" alt="TEPPEN MEO" className="h-10 w-auto" />
          <h1 className="mt-4 text-4xl font-semibold">
            ローカル運用を一つにまとめる。
          </h1>
          <p className="mt-4 text-sm text-slate-200">
            Google/Metaを連携し、レビュー対応と投稿を一つの画面で進めます。
          </p>
        </div>
        <div className="w-full max-w-md rounded-2xl bg-white/95 p-6 shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}
