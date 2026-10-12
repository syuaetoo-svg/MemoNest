import { spawnSync, spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

// Never print proxy configuration or forward credentials to a new remote relay.
export function resolveWindowsProxy(config) {
  if (!config.enabled) return null;
  if (typeof config.server !== "string" || !config.server.trim()) {
    throw new Error("Unsupported Windows proxy format.");
  }
  const entries = config.server.split(";").map((entry) => entry.trim());
  const address = entries.find((entry) => entry.startsWith("https="))?.slice(6) ||
    entries.find((entry) => entry.startsWith("http="))?.slice(5) ||
    (entries.length === 1 && !entries[0].includes("=") ? entries[0] : "");
  let proxy;
  try {
    proxy = new URL(address.includes("://") ? address : `http://${address}`);
  } catch {
    throw new Error("Unsupported Windows proxy format.");
  }
  if (proxy.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(proxy.hostname) ||
      proxy.username || proxy.password || proxy.pathname !== "/" || proxy.search || proxy.hash) {
    throw new Error("Only the existing local HTTP proxy is supported.");
  }
  return proxy.origin;
}

function main() {
  const optional = process.argv[2] === "--optional";
  const command = process.argv.slice(optional ? 3 : 2);
  if (process.platform !== "win32" || command.length === 0) {
    throw new Error("This launcher requires Windows and a Node command.");
  }
  const settings = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command",
    "$p = Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'; @{enabled=($p.ProxyEnable -eq 1);server=$p.ProxyServer} | ConvertTo-Json -Compress"],
    { encoding: "utf8", windowsHide: true, timeout: 10000 });
  let config;
  try { config = JSON.parse(settings.stdout); } catch {
    throw new Error("Windows proxy settings could not be read; details suppressed.");
  }
  const proxy = resolveWindowsProxy(config);
  if (!proxy && !optional) throw new Error("An enabled Windows proxy is required.");
  console.log(proxy
    ? "Using the enabled local Windows proxy for Node; localhost bypassed."
    : "No enabled Windows proxy; using the normal Node connection.");
  const child = spawn(process.execPath, proxy ? ["--use-env-proxy", ...command] : command, {
    stdio: "inherit", windowsHide: true,
    env: proxy ? { ...process.env, HTTPS_PROXY: proxy, HTTP_PROXY: proxy,
      NO_PROXY: "localhost,127.0.0.1,::1", NODE_USE_ENV_PROXY: "1" } : process.env,
  });
  child.on("error", () => { console.error("Node process could not start."); process.exitCode = 1; });
  child.on("exit", (code) => { process.exitCode = code ?? 1; });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try { main(); } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
