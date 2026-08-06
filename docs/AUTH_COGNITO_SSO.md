# Comunidade (Edital Admin) — Cognito SSO

OIDC no App Router (Authorization Code + PKCE). Sessão do painel continua no cookie HttpOnly `admin_session`.

**Autorização:** tag `edital-admin` em `users.platforms`.

## Fluxo

1. `GET /auth/login` → Hosted UI Cognito  
2. Callback `GET /auth/callback`  
3. Resolve `cognito_sub` / e-mail + exige `edital-admin`  
4. Emite cookie `admin_session` e redireciona para `/admin/editais`

## Feature flag

`AUTH_MODE` = `legacy` | `hybrid` | `cognito`

## Dev local

Porta **3003** (Hub `3000`, Admin `3001`, Coin `3002`).

```bash
# após terraform apply do client comunidade-web
node scripts/append-cognito-env.mjs
npm run dev
```

Abrir `http://localhost:3003/admin/login` → **Entrar com SSO**.

## Rollback

`AUTH_MODE=legacy` no `.env` e reiniciar.
