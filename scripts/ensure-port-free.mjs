import net from "node:net";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
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
if (existsSync(lockPath)) {
  console.error("E2Eの事前チェックに失敗しました: .next/dev/lock が残っています。");
  console.error("対処: rm -f .next/dev/lock を実行し、再度試してください。");
  process.exit(1);
}

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
  console.error("対処: docs/runbooks/dev-server-port-lock.md を確認してください。");
  process.exit(1);
}

process.exit(0);
