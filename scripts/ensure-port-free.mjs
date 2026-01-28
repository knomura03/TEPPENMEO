import net from "node:net";
import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import { platform } from "node:process";

const defaultPort = 3000;
const baseUrlEnv = process.env.E2E_BASE_URL;
const portEnv = process.env.E2E_PORT;
let port = defaultPort;
let host = "127.0.0.1";

try {
  if (baseUrlEnv) {
    const url = new URL(baseUrlEnv);
    if (url.hostname) host = url.hostname;
    if (url.port) port = Number(url.port);
  }
} catch {
  // URLが不正な場合はデフォルトで進める
}

if (portEnv) {
  const parsed = Number(portEnv);
  if (!Number.isNaN(parsed) && parsed > 0) {
    port = parsed;
  }
}

const lockPath = ".next/dev/lock";
const lockExists = existsSync(lockPath);

const checkPort = (targetPort) =>
  new Promise((resolve) => {
    const socket = net.connect({ host, port: targetPort });
    socket.setTimeout(800);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      resolve(false);
    });
  });

const inUse = await checkPort(port);
if (inUse) {
  console.error(`E2Eの事前チェックに失敗しました: ${host}:${port} が使用中です。`);
  if (platform === "darwin" || platform === "linux") {
    try {
      const out = execSync(
        `lsof -nP -iTCP:${port} -sTCP:LISTEN || true`,
        { stdio: "pipe" }
      ).toString();
      if (out.trim()) {
        console.error("--- 使用中プロセス ---");
        console.error(out.trim());
      }
    } catch {
      // lsof が無い場合は無視
    }
  }
  if (lockExists) {
    console.error("補足: ロックが残っている可能性があります。サーバー停止後に再実行してください。");
  }
  console.error("対処: docs/runbooks/dev-server-port-lock.md を確認してください。");
  process.exit(1);
}

if (lockExists) {
  try {
    unlinkSync(lockPath);
    console.warn("E2E事前チェック: 残っていたロックを自動で解除しました。");
  } catch {
    console.error("E2Eの事前チェックに失敗しました: ロック削除に失敗しました。");
    console.error("対処: 権限/所有者を確認し、手動で削除してから再実行してください。");
    process.exit(1);
  }
}

process.exit(0);
