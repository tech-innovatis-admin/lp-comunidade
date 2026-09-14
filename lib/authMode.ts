export type AuthMode = "legacy" | "hybrid" | "cognito" | "broker";

/** Bracket access so Docker/runtime AUTH_MODE is not inlined at `next build`. */
function env(name: string): string | undefined {
  return process.env[name];
}

export function getAuthMode(): AuthMode {
  const mode = (env("AUTH_MODE") || "legacy").trim().toLowerCase();
  if (mode === "legacy" || mode === "hybrid" || mode === "cognito" || mode === "broker") {
    return mode;
  }
  return "legacy";
}

export function brokerEnabled(mode: AuthMode = getAuthMode()) {
  return mode === "hybrid" || mode === "broker";
}

export function centralOidcConfigured() {
  return Boolean(process.env["CENTRAL_OIDC_CLIENT_SECRET"]?.trim());
}

export function ssoEnabled(mode: AuthMode = getAuthMode()) {
  return (brokerEnabled(mode) && centralOidcConfigured()) || cognitoEnabled(mode);
}

export function credentialsEnabled(mode: AuthMode = getAuthMode()) {
  return mode === "legacy" || mode === "hybrid";
}

export function cognitoEnabled(mode: AuthMode = getAuthMode()) {
  if (brokerEnabled(mode) && centralOidcConfigured()) {
    return false;
  }
  return mode === "hybrid" || mode === "cognito";
}

export function unauthenticatedAdminPath(mode: AuthMode = getAuthMode()) {
  if (brokerEnabled(mode) && centralOidcConfigured()) {
    return "/auth/login";
  }
  return cognitoEnabled(mode) ? "/auth/login" : "/admin/login";
}
