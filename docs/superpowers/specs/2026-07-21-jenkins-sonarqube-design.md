# Integração Jenkins + SonarQube

**Data**: 2026-07-21
**Status**: Aprovado

## Contexto

O pipeline Jenkins do repositório (`Jenkinsfile`) já roda com sucesso duas stages: `Install dependencies` (`npm ci`) e `Build` (`npm run build`), acionado em PRs (ex: build da PR-3 bem-sucedido). O objetivo agora é adicionar análise estática de código via SonarQube Community Build, com o Quality Gate bloqueando o merge quando reprovado.

Infraestrutura já provisionada pelo usuário antes desta spec:
- Servidor SonarQube Community Build (v26.4.0) rodando em `https://devops-innovacao-sonarqube.pqluhr.easypanel.host`.
- Projeto criado no Sonar com project key `lp-comunidade`, New Code Definition = **reference branch `main`** (compara cada PR/branch contra `main`, adequado ao fluxo de PRs via Jenkins).
- Jenkins: servidor SonarQube cadastrado em *Manage Jenkins → System → SonarQube servers* com o nome `SonarQube`, credencial Secret text com um **Global Analysis Token** do Sonar.
- Webhook do Sonar (`Administration → Configuration → Webhooks`) apontando para o endpoint do Jenkins, necessário para o passo `waitForQualityGate` funcionar sem polling.

Não existe suite de testes automatizados no repositório (ver `CLAUDE.md`). Por isso, o ajuste de condições de cobertura no Quality Gate fica fora deste escopo — é responsabilidade do usuário ajustar diretamente no painel do Sonar (ex: remover/relaxar a condição de cobertura em código novo), não algo configurável via `Jenkinsfile` ou `sonar-project.properties`.

## Decisões

- **Scanner**: `@sonar/scan` via `npx`, não o SonarQube Scanner CLI genérico (Java) instalado via *Manage Jenkins → Tools*. Justificativa: o projeto é 100% Node/Next.js, o Jenkinsfile já declara `tools { nodejs 'node-20' }`, e o próprio SonarQube recomenda esse scanner para projetos JS/TS — evita uma configuração global adicional no Jenkins.
- **Quality Gate**: bloqueia o pipeline (`abortPipeline: true`) se reprovado. Escolha deliberada do usuário para forçar correção antes do merge, mesmo sendo a introdução inicial do Sonar no projeto.
- **Token do Sonar**: Global Analysis Token (a UI do Sonar usada não expôs a opção de Project Analysis Token na tela de geração de token de My Account). Suficiente pois é restrito a operações de análise, não à API completa de um usuário.
- **New Code Definition**: reference branch `main`, não "previous version" (não há controle de `sonar.projectVersion` no projeto) nem "number of days" (menos preciso que comparar contra a branch de destino real dos PRs).

## Arquivos a criar/alterar

### `sonar-project.properties` (novo, raiz do repo)

```properties
sonar.projectKey=lp-comunidade
sonar.projectName=InnovaNation - Landing Comunidade
sonar.sources=app,lib,scripts
sonar.exclusions=**/node_modules/**,**/.next/**,public/**,**/*.d.ts
sonar.sourceEncoding=UTF-8
```

### `Jenkinsfile` (adiciona duas stages ao final, depois de `Build`)

```groovy
stage('SonarQube Analysis') {
    steps {
        withSonarQubeEnv('SonarQube') {
            sh 'npx --yes @sonar/scan'
        }
    }
}

stage('Quality Gate') {
    steps {
        timeout(time: 5, unit: 'MINUTES') {
            waitForQualityGate abortPipeline: true
        }
    }
}
```

`withSonarQubeEnv('SonarQube')` injeta `SONAR_HOST_URL` e `SONAR_TOKEN` como variáveis de ambiente, lidas automaticamente pelo `@sonar/scan` — não é necessário passar flags `-D` na linha de comando, já que `projectKey`/`sources`/`exclusions` vêm do `sonar-project.properties`.

## Fora de escopo

- Ajuste de condições de cobertura no Quality Gate (feito manualmente no painel do Sonar).
- Decoração de Pull Requests no GitHub (o SonarQube Community Build v26.4 suporta isso nativamente, mas não foi solicitado agora — pode ser um follow-up).
- Testes automatizados / geração de relatório de cobertura (LCOV) — não existem testes no repo.
- Qualquer mudança nas stages `Install dependencies` e `Build` já existentes.

## Riscos / notas

- O token exibido durante a configuração manual do projeto no Sonar (via screenshot) deve ser tratado como potencialmente exposto — recomendado revogá-lo e gerar um novo antes de usá-lo na credencial do Jenkins.
- Se o webhook do Sonar não estiver corretamente configurado, `waitForQualityGate` vai aguardar até o timeout de 5 minutos e falhar o build por timeout, não por reprovação do gate — importante diferenciar esses dois cenários de falha ao debugar.
