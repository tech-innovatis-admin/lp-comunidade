# Arquitetura e estrutura

Revisado em 2026-09-11 no checkout local. Consulte [estado](project-state.md)
para diferenciar alteracoes locais de publicacao.

## Produto e stack

Comunidade InnovaNation: landing, cadastro da comunidade, proposta do Edital PPI
e painel de avaliacao. Nome tecnico npm: `hub-plataformas-innovatis`.
Next.js 15 (`^15.5.20`), React 19.1, TypeScript estrito, Tailwind CSS 4,
PostgreSQL/`pg`, AWS SDK S3, Google APIs, `pdf-lib`, `pdf-to-img` e `sharp`.
O lockfile define versoes instaladas; CI e Docker usam Node 20.

## Mapa

| Caminho | Responsabilidade |
| --- | --- |
| `app/page.tsx`, `app/layout.tsx`, `app/globals.css` | Home, layout e estilos |
| `app/components/` | Secoes publicas, formulario, termos e gate |
| `app/components/edital/` | Wizard, etapas, uploads e fotos |
| `app/components/admin/` | Acoes e thumbnails |
| `app/inscricao/`, `app/edital/` | Cadastro e proposta |
| `app/admin/`, `app/auth/` | Painel e autenticacao |
| `app/api/` | Handlers HTTP do backend |
| `lib/` | Banco, auth, contratos, validacoes, PDF e integracoes |
| `database/migrations/`, `database/terms/` | SQL e termo HTML |
| `public/` | Logos, fotos, fontes Poppins, timbrado e anexos |
| `scripts/`, `ps1/` | Setup, manutencao e deploy; PowerShell no segundo |
| `nginx/` | Exemplos de hardening |
| `.github/`, `Jenkinsfile`, `sonar-project.properties` | CI e analise |
| `Dockerfile`, `docker-compose.yml`, `next.config.ts` | Runtime standalone |
| `MDs/`, `docs/` | Guias e historico |
| `.context/`, `AGENTS.md` | Contexto vivo e instrucoes comuns |

## Inscricao

`/` renderiza `HeroSection`, `EditalAnnouncementSection`,
`InnovaNationSection`, depoimentos e cadastro. A secao do Edital PPI 2026
aponta `Inscreva-se` para `/edital` e abre o edital principal por link/download
em `/edital/edital-ppi-2026.pdf`; esse PDF ainda precisa ser fornecido para
aceite final.

`/inscricao/formulario` usa `RegistrationFormSection.tsx`.
`/inscricao` apresenta o comunicado de pre-cadastro.

`RegistrationFormSection` -> `lib/api.ts` -> `POST /api/inscricoes` -> PostgreSQL.
A rota valida dados, arquivo e termos, verifica duplicidade CPF/email, calcula
hashes e persiste identidade e cadastro em transacao. Sheets e n8n recebem dados
apos commit como best-effort. O frontend tenta liberar a entrada no Edital.
`GET /api/terms/active` fornece os termos ativos.

`/acesso-documento/[id]` e a entrada de visualizacao;
`GET /api/documents/[id]` exige sessao admin e verifica hash antes de servir o arquivo.

## Edital

`/edital` -> `EditalCpfGate` -> `POST /api/editais/validar-cpf` ->
`/edital/proposta` -> `EditalPropostaWizard`.

O gate exige cadastro confirmado, emite token e prefill.
`lib/edital-session.ts` guarda token/prefill em `sessionStorage`;
`lib/edital-auth.ts` valida o token no servidor. Os handlers verificam propriedade
da proposta. `lib/edital-proposta-api.ts` centraliza chamadas do wizard.

| Endpoint em `/api/editais` | Papel |
| --- | --- |
| `GET/POST /proposta/rascunho` | Recuperar/salvar proposta parcial |
| `POST /proposta/documento` | Upload validado para S3 |
| `GET/DELETE /proposta/documento/[id]` | Acesso/remocao pelo proponente |
| `POST /proposta/enviar` | Revalidar, gerar PDFs, protocolar e finalizar |
| `GET /documento/[id]/link` e `/thumbnail` | Acesso admin a anexos |
| `GET /certificado/[registrationId]/link` e `/thumbnail` | Certificado |

Regras: `edital-requirements.ts`, `edital-completeness.ts`, `br-documents.ts`,
`edital-client-types.ts`, `edital-dtos.ts`, `edital-dto-validation.ts`,
`edital-document-types.ts` e `edital-document-validation.ts`. Contratos HTTP do
Edital usam DTOs allowlisted; rotas nao devem expor CPF completo,
`registrationId`, S3 key, hashes, IP, user-agent, tokens ou linhas brutas do
banco ao cliente.

Atualmente: documentos do usuario aceitam PDF, DOC, DOCX, JPEG, PNG e WEBP com
validacao de MIME, extensao e assinatura binaria, limite de 10 MiB; fotos
continuam JPEG, PNG e WEBP, com 5 MiB por foto e quantidade de 3 a 8. O wizard
usa `EditalUploadBusyContext` para impedir uploads concorrentes e comprime
imagens no cliente antes do POST (`lib/edital-image-compress.ts`). Codigos
`8.1.8` (fotos) e `8.1.10` (termo) sao gerados automaticamente. Confira
constantes ao editar.

IDs `BIGINT` vindos do PostgreSQL sao normalizados na fronteira do banco com
`parseDatabaseId` antes de comparacao de propriedade ou envio em DTO. Exclusao de
documento/foto em rascunho remove a linha em transacao e limpa S3 como best-effort
apos commit.

O envio revalida dentro de transacao e muda `DRAFT` para `SUBMITTED`.
`lib/edital-protocol.ts` aloca sequencial anual atomicamente usando ano em
`America/Fortaleza`, seguido da sequencia com minimo de quatro digitos.
Helpers `lib/*pdf.ts`, `thumbnail.ts` e `letterhead.ts` tratam documentos gerados.
Word nao tem thumbnail; o admin renderiza fallback e baixa DOC/DOCX como
attachment com nome sanitizado.

## Admin e auth

`/admin/editais` lista propostas; `/admin/editais/[id]` exibe detalhes.
`POST /api/admin/editais/[id]/avaliacao`, `/desqualificar` e `/requalificar`
tratam acoes. `edital-evaluation.ts` concentra criterios, total de 100 pontos
e limiar de 70; nao duplique regras na logica.

`authMode.ts` aceita `legacy`, `hybrid`, `cognito` e `broker` no checkout atual.
Em modo hibrido, configuracao do segredo central seleciona broker. Leia esse
modulo antes de alterar selecao de login.

- `admin-auth.ts`: token e identidade administrativa.
- `admin-session.ts`: cookie `admin_session` e verificacao adicional do broker.
- `platforms-db.ts`: usuarios compartilhados e permissao `edital-admin`.
- `cognitoOidc.ts`: SSO Cognito.
- `centralOidc.ts`, `brokerIntrospection.ts`: OIDC central e introspeccao.
- `redirectTarget.ts`: destino de retorno seguro.
- `app/auth/login`, `callback`, `logout`: fluxo SSO.

As extensoes de broker incluem trabalho local nao commitado na data da revisao.

## Dados e integracoes

| Entidade | Papel |
| --- | --- |
| `terms_of_use` | Versoes e hash dos termos |
| `registrations` | Cadastro, identidade BYTEA, consentimento e certificado |
| `edital_submissions` | Proposta, status, avaliacao e desqualificacao |
| `edital_submission_documents` | Chaves S3, codigos, hashes e thumbnails |
| `edital_protocol_sequences` | Contador anual |
| `registration_invites` | Legado WhatsApp |
| `users` no banco de plataformas | Identidades/permissoes, fora do schema principal |

`lib/db.ts` usa `DB_*`; `lib/platforms-db.ts` usa `PLATFORMS_DB_*`.
`DATABASE_URL` pertence ao executor de migrations, nao ao pool principal.
SQLs mostram schema esperado, nao comprovam aplicacao no ambiente publicado.

`google-sheets.ts` carrega credenciais de S3 ou alternativas de ambiente;
`s3.ts` centraliza objetos e URLs assinadas. Webhooks de cadastro/Edital sao
separados; falhas de sincronizacao nao desfazem persistencia principal.

`middleware.ts` aplica CSP nonce e headers; `security.ts` concentra protecoes
de entrada. Rate limit e em memoria por processo. `/api/health` restringe acesso
a request interna ou token. Consulte [backend](../MDs/BACKEND.md) e
[seguranca](../MDs/SEGURANCA_JURIDICA.md), confrontando com handlers atuais.
