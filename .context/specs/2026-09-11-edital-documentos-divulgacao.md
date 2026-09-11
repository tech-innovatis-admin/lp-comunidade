# Edital PPI: documentos, exclusao e divulgacao

Data: 2026-09-11
Status: implementada
Origem: solicitacao do usuario com referencias visuais e arquivos oficiais.
Plano: [implementacao](../plans/2026-09-11-edital-documentos-divulgacao.md).

Aceite final: pendente do PDF oficial em
`public/edital/edital-ppi-2026.pdf`. O codigo, os anexos DOCX e os contratos
foram implementados e verificados localmente em 2026-09-11, mas a liberacao da
divulgacao completa depende desse asset e de validacao manual em ambiente
descartavel.

## Problema e objetivo

O fluxo atual disponibiliza os Anexos I e II somente em PDF, aceita apenas PDF
nos campos documentais e falha ao excluir arquivos/fotos do rascunho. A pagina
inicial tambem nao divulga diretamente o Edital PPI 2026.

Esta entrega deve:

- publicar os modelos oficiais dos Anexos I e II em Word;
- aceitar PDF, DOC e DOCX em todos os campos documentais do Edital;
- manter JPG, PNG e WEBP exclusivos para as fotos;
- restaurar a exclusao de documentos e fotos enquanto a proposta estiver em rascunho;
- orientar o preenchimento da etapa Proposta pelo item 7.3 do edital;
- divulgar o Edital PPI 2026 na home e levar a pessoa para `/edital`.
- separar o contrato HTTP do Edital dos tipos e linhas internas do banco por meio
  de DTOs com allowlist explícita, reduzindo exposição acidental de dados sensíveis.

## Evidencias do estado atual

- `public/edital/` contem apenas os dois anexos em PDF.
- `EditalCpfGate.tsx` e `TelaDeclaracoes.tsx` apontam para esses PDFs.
- `TelaEquipe.tsx`, `TelaInstituicao.tsx` e `TelaDeclaracoes.tsx` usam
  `accept="application/pdf"`; a rota de upload rejeita outro MIME.
- `edital_submission_documents.id` e `registration_id` sao `BIGINT`. O driver
  `pg` entrega `BIGINT` como string, mas o token devolve `registrationId` number.
  `GET/DELETE /api/editais/proposta/documento/[id]` comparam esses valores por
  igualdade estrita, resultando em 404 para arquivo pertencente ao usuario.
- O DELETE remove somente a linha do PostgreSQL e deixa o objeto no S3.
- A rota administrativa de thumbnail trata todo arquivo nao-PDF como imagem;
  DOC/DOCX causariam erro no `sharp`.
- `app/page.tsx` renderiza Hero e, logo depois, `InnovaNationSection`.
- A CSP atual usa `frame-src 'none'` e `object-src 'none'`; o edital principal
  deve abrir por link seguro em nova aba/download, sem embed do PDF no modal.

## Escopo funcional

### 0. Fronteira de dados e DTOs da submissão

Todo o fluxo `/api/editais` deve comunicar com o frontend por DTOs explícitos,
sem retornar objetos de `pg`, linhas de banco, chaves S3, hashes, CPF completo,
IP, user-agent, tokens internos ou metadados de auditoria.

Criar módulos server-safe e browser-safe separados, por exemplo:

- `lib/edital-dtos.ts`: tipos públicos de request/response e mapeadores de
  persistencia para `EditalSubmissionDto`, `EditalSubmissionDocumentDto`,
  `EditalValidationDto`, `EditalDraftRequestDto`, `EditalDraftResponseDto` e
  `EditalDocumentUploadResponseDto`;
- `lib/edital-dto-validation.ts`: parsing/allowlist de body JSON, FormData e
  parâmetros de rota, rejeitando campos desconhecidos, tipos errados, strings
  acima dos limites e códigos que não pertençam ao fluxo;
- `lib/edital-client-types.ts`: somente tipos e constantes que podem ser
  importados por componentes client, sem `pg`, `Buffer`, S3 ou segredos.

O DTO público de submissão pode conter apenas: identificador público numérico,
status, campos da proposta necessários à tela, datas ISO e documentos com
`id`, `requirementCode`, `originalFilename`, `mimeType`, `sizeBytes` e
`uploadedAt`. Nunca incluir `registrationId` no payload do wizard, CPF, chave
S3, hash, conteúdo binário ou dados de request. O servidor deriva o proprietário
exclusivamente do token e usa o ID interno somente em queries parametrizadas.

Requests de rascunho devem aceitar somente os campos definidos para o step atual;
requests de upload devem aceitar somente `requirementCode` e `file`; requests de
envio não devem aceitar dados da proposta no body. Respostas de erro devem usar
um formato estável `{ error, message?, missing? }`, sem stack trace ou valores
recebidos. O mapeamento DTO deve ser testado para garantir que adicionar uma
coluna sensível ao banco não a exponha automaticamente.

Os DTOs não substituem autenticação/autorização: cada rota continua exigindo
token, origem confiável, rate limit e verificação de propriedade/status antes de
consultar ou alterar dados.

### 1. Modelos oficiais em Word

Usar os arquivos fornecidos pelo usuario:

- `/Users/innovatis/Downloads/ANEXO I – Declaração de Responsabilidade Do Coordenador ou Responsável Técnico.docx`
- `/Users/innovatis/Downloads/ANEXO II – Termo de Compromisso de Contrapartida Institucional.docx`

Publica-los com nomes estaveis e ASCII:

- `/edital/anexo-i-declaracao-responsabilidade.docx`
- `/edital/anexo-ii-termo-contrapartida.docx`

Os dois arquivos foram reconhecidos como Microsoft Word 2007+ e passaram em
`unzip -t` em 2026-09-11. Os PDFs antigos deixam de ser os links oficiais; podem
ser removidos na implementacao depois de confirmar que nenhuma referencia resta.

O gate pos-CPF e a etapa Declaracoes devem baixar os `.docx`. A confirmacao do
gate continua obrigatoria. Depois de preenchidos e assinados, os anexos podem
ser enviados em PDF, DOC ou DOCX.

### 2. Politica de arquivos do Edital

Campos documentais dos codigos 8.1.1 a 8.1.7, 8.1.15 e 8.1.16 aceitam:

| Formato | Extensao | MIME canonico | Validacao de assinatura |
| --- | --- | --- | --- |
| PDF | `.pdf` | `application/pdf` | prefixo `%PDF-` |
| Word legado | `.doc` | `application/msword` | assinatura OLE/CFB `D0 CF 11 E0 A1 B1 1A E1` |
| Word OOXML | `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | assinatura ZIP com marcadores `[Content_Types].xml` e `word/document.xml` |

O backend deve exigir coerencia entre extensao, MIME aceito e assinatura. Para
DOCX, `application/zip` e `application/octet-stream` podem ser aceitos como MIME
informado pelo navegador somente quando extensao e estrutura OOXML forem validas;
o MIME persistido/S3 deve ser normalizado para o canonico. Para DOC, o fallback
`application/octet-stream` segue a mesma regra de extensao e assinatura OLE.

O limite permanece 10 MiB por documento. Fotos continuam aceitando somente
JPEG, PNG e WEBP, com limite de 5 MiB por foto e quantidade de 3 a 8. Arquivos
gerados pelo sistema continuam em PDF e nao entram nessa ampliacao.

As regras de extensao/MIME usadas pelo frontend e os validadores binarios do
servidor devem ficar em modulos focados, evitando listas divergentes nas telas.
Mensagens de erro devem informar os formatos permitidos sem expor detalhes internos.

### 3. Acesso administrativo a Word

PDF e imagem continuam com thumbnails. DOC e DOCX exibem no painel um fallback
com icone de arquivo, nome e formato, sem chamar a rota de thumbnail. Ao abrir
um Word, a rota assinada deve enviar `Content-Disposition: attachment` com nome
sanitizado; PDF/imagem continuam abrindo inline.

A rota de thumbnail deve rejeitar MIME nao suportado com resposta controlada,
em vez de enviar Word ao `sharp`. Nao sera implementada conversao de Word para
imagem/PDF nesta entrega.

### 4. Exclusao no rascunho

Normalizar IDs retornados pelo PostgreSQL antes de compara-los ou envia-los ao
cliente, mantendo o modelo numerico ja usado pelo aplicativo e rejeitando valores
que nao sejam inteiros positivos seguros. Nao substituir a autorizacao por uma
comparacao flexivel.

Ao excluir documento ou foto:

1. validar origem, rate limit, token, propriedade e status `DRAFT`;
2. bloquear a linha e obter `s3_key`/`thumbnail_s3_key`;
3. excluir a linha no PostgreSQL dentro da transacao;
4. depois do commit, apagar objetos correspondentes no S3 como best-effort;
5. responder sucesso e remover imediatamente o item do estado do wizard.

Falha de limpeza do S3 deve ser registrada sem dados pessoais e nao deve restaurar
uma linha ja removida. Proposta `SUBMITTED`, token expirado ou documento de outro
usuario continuam bloqueados. Enquanto a remocao estiver em curso, apenas o botao
daquele item fica desabilitado e exibe progresso; falhas aparecem junto ao item.

### 5. Orientacao da proposta

No inicio da etapa `TelaProposta`, logo abaixo da descricao da etapa, exibir em
destaque informativo a frase exata:

> As instruções para submissão da proposta estão descritas no item 7.3 do edital.

O texto e apenas orientativo; nao cria campo, persistencia ou validacao nova.

### 6. Divulgacao na pagina da comunidade

Inserir uma secao propria em `app/page.tsx` entre `HeroSection` e
`InnovaNationSection`, seguindo a linguagem visual da home e usando a imagem
fornecida apenas como referencia de hierarquia/conteudo.

Conteudo:

- titulo: `Edital PPI 2026`;
- subtitulo: `Apoio ao fortalecimento e modernização de laboratórios`;
- periodo: `Inscrições: 17/09 a 04/10/2026`;
- acao secundaria: `Edital do Programa`;
- acao principal: `Inscreva-se`.

`Inscreva-se` navega para `/edital`. `Edital do Programa` abre um modal com
titulo, subtitulo, periodo e resumo do programa, alem de `Abrir edital` e
`Baixar edital`. As duas acoes apontam para `/edital/edital-ppi-2026.pdf`;
abrir usa nova aba e baixar usa o atributo `download`.

O PDF oficial ainda nao foi fornecido. Ele e um pre-requisito de aceite da
implementacao e deve ser copiado exatamente para
`public/edital/edital-ppi-2026.pdf` antes de liberar a entrega. O modal sera
construido como se o arquivo ja estivesse presente, sem estado provisório.

O modal deve ter `role="dialog"`, nome acessivel, foco inicial no botao fechar,
fechamento por X, Escape e clique no backdrop, restauracao de foco ao gatilho e
bloqueio de scroll do body. Clique no conteudo nao fecha o modal. Em telas
pequenas, conteudo e botoes nao podem ultrapassar o viewport.

## Criterios de aceite

1. Gate e Declaracoes baixam os dois `.docx` oficiais; nao restam links ativos
   para os PDFs antigos dos anexos.
2. Todo campo documental aceita PDF, DOC e DOCX e rejeita arquivo renomeado,
   MIME/assinatura incoerentes, formato nao permitido e arquivo acima de 10 MiB.
3. Fotos mantem formatos, limites e quantidade atuais.
4. Um documento e uma foto recem-enviados podem ser excluidos; ao recarregar,
   nao reaparecem. Outro usuario e proposta enviada nao podem exclui-los.
5. GET/DELETE de documento proprio nao falham por diferenca string/number em BIGINT.
6. O painel nao solicita thumbnail para Word e permite baixa-lo com nome adequado.
7. A frase do item 7.3 aparece uma vez no topo da etapa Proposta.
8. A nova secao aparece entre o hero e os beneficios, com as copias e datas exatas.
9. O modal atende teclado, foco, backdrop e responsividade; abrir/baixar usa o PDF
   oficial e `Inscreva-se` leva a `/edital`.
10. Testes automatizados, checagem TypeScript, build e validacao manual dos fluxos
    afetados estao registrados. Nenhum webhook, migration ou dado real e necessario.
11. Todas as respostas das rotas do Edital passam por DTOs allowlisted e nenhum
    payload client contém CPF completo, `registrationId`, chave S3, hash, IP,
    user-agent, token ou linha bruta do banco.
12. Bodies de rascunho/upload/envio rejeitam propriedades inesperadas e mantêm
    mensagens de erro estáveis, sem detalhes internos.

## Aceite registrado em 2026-09-11

- Implementado localmente: DTOs allowlisted, validacao PDF/DOC/DOCX, anexos DOCX
  oficiais, links para modelos Word, upload documental ampliado, normalizacao de
  IDs `BIGINT`, exclusao em rascunho com limpeza S3 best-effort, fallback Word no
  admin, texto do item 7.3 e secao/modal do Edital na home.
- Verificacao automatizada: `npm test`, `npx tsc --noEmit`, `npm run build`,
  `git diff --check` e buscas `rg` do plano executadas com sucesso.
- Pendente para aceite final: copiar e validar
  `public/edital/edital-ppi-2026.pdf`; testar matriz manual em ambiente
  descartavel autorizado, incluindo uploads reais, exclusao/reload, propriedade,
  admin PDF/Word, modal por mouse/teclado e CTA `/edital`.

## Fora de escopo

- Converter documentos Word enviados para PDF ou gerar thumbnail deles.
- Aceitar formatos Excel, PowerPoint, OpenDocument, texto ou imagens em campos documentais.
- Alterar schema, codigos obrigatorios, limites, datas ou periodo do Edital.
- Alterar cadastro da comunidade, gate CPF, envio final, protocolo ou webhooks.
- Hospedar/editar o conteudo do edital em banco ou CMS.

## Decisoes confirmadas

- 2026-09-11: usuario confirmou PDF, DOC e DOCX nos documentos; imagens somente em fotos.
- 2026-09-11: usuario forneceu os dois anexos oficiais em DOCX.
- 2026-09-11: o CTA `Inscreva-se` deve ir para `/edital`.
- 2026-09-11: modal deve ser preparado como se o PDF principal ja existisse; o
  arquivo sera fornecido antes da implementacao ser considerada pronta.
