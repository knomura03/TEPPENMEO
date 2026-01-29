console.log("staging実行メモ（値は書かない）");
console.log("\n[1] preflight");
console.log("- pnpm preflight --mode real --env staging");
console.log("- 結果: OK / NG（値は貼らない）\n");

console.log("[2] provider-health");
console.log("- /admin/provider-health を開く");
console.log("- Google/Meta: OK/注意/未設定を記録（値は貼らない）\n");

console.log("[3] 実機スモーク");
console.log("- 口コミ取得/返信/投稿（Google）");
console.log("- コメント取得/返信/投稿（Meta）\n");

console.log("[4] 記録");
console.log("- docs/runbooks/staging-real-smoke-evidence.md を参照");
