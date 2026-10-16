/** Read-only runtime diagnostic. No registration, mail send, private-user reads or secret output. */
import { serviceConfig } from "../src/lib/server/config";
async function main() {
  const config = serviceConfig();
  if (!config) { console.log(JSON.stringify({ configured: false, code: "CONFIG_REQUIRED" })); process.exitCode = 2; return; }
  const response = await fetch(`${config.url}/auth/v1/settings`, { headers: { apikey: config.key }, signal: AbortSignal.timeout(15000), redirect: "error" });
  if (!response.ok) { console.log(JSON.stringify({ configured: true, authSettingsHttp: response.status, code: "AUTH_SETTINGS_UNAVAILABLE" })); process.exitCode = 1; return; }
  const settings = await response.json();
  console.log(JSON.stringify({ configured: true, authSettingsHttp: response.status, emailProviderEnabled: settings.external?.email === true, requiresEmailConfirmation: settings.mailer_autoconfirm === false,
    signupDisabled: typeof settings.disable_signup === "boolean" ? settings.disable_signup : "not_exposed",
    applicationOrigin: process.env.APP_URL ? new URL(process.env.APP_URL).origin : "not_configured",
    smtpConfiguration: "not_exposed_by_public_settings", emailDeliveryLogs: "not_accessible_without_management_access", userCreationStatus: "not_accessible_without_management_access", hostedSiteAndRedirectUrls: "not_exposed_by_public_settings" }));
}
main().catch(()=>{console.log(JSON.stringify({ code: "AUTH_DIAGNOSTIC_NETWORK_OR_FORMAT_FAILURE" }));process.exitCode=1;});
