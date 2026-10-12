import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const next = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const args = [next, "dev", "--hostname", "0.0.0.0", ...process.argv.slice(2)];
const command = process.platform === "win32"
  ? [fileURLToPath(new URL("./with-windows-proxy.mjs", import.meta.url)), "--optional", ...args]
  : args;
const child = spawn(process.execPath, command, { stdio: "inherit", windowsHide: true });
child.on("error", () => { console.error("Development server could not start."); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
