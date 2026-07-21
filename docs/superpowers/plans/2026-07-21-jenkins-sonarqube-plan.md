# Jenkins + SonarQube Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar análise estática SonarQube ao pipeline Jenkins existente, bloqueando o build se o Quality Gate reprovar.

**Architecture:** Duas stages novas no `Jenkinsfile` (`SonarQube Analysis`, `Quality Gate`) rodando depois de `Build`, usando o scanner `@sonar/scan` via npm (reaproveitando o `nodejs 'node-20'` já declarado no pipeline) contra um servidor SonarQube já provisionado e configurado no Jenkins (*Manage Jenkins → System → SonarQube servers*, nome `SonarQube`).

**Tech Stack:** Jenkins Declarative Pipeline (Groovy), plugin "SonarQube Scanner for Jenkins" (`withSonarQubeEnv`, `waitForQualityGate`), pacote npm `@sonar/scan`.

## Global Constraints

- Project key no Sonar: `lp-comunidade` (já criado, New Code Definition = reference branch `main`).
- Nome do servidor Sonar cadastrado no Jenkins: `SonarQube` (deve bater exatamente com o argumento de `withSonarQubeEnv(...)`).
- Quality Gate deve **bloquear** o pipeline (`abortPipeline: true`) — decisão deliberada do usuário.
- Não alterar as stages `Install dependencies` e `Build` já existentes.
- Não configurar cobertura de testes (não há testes automatizados no repo) — fora de escopo.
- Scanner: `@sonar/scan` via `npx`, não o SonarQube Scanner CLI via *Manage Jenkins → Tools* (decisão do spec, evita config global extra).

---

### Task 1: Adicionar análise SonarQube ao pipeline Jenkins

**Files:**
- Create: `sonar-project.properties`
- Modify: `Jenkinsfile:19-20`

**Interfaces:**
- N/A (configuração de infraestrutura, sem código de aplicação consumido/produzido por outras tasks).

- [ ] **Step 1: Criar `sonar-project.properties` na raiz do repositório**

```properties
sonar.projectKey=lp-comunidade
sonar.projectName=InnovaNation - Landing Comunidade
sonar.sources=app,lib,scripts
sonar.exclusions=**/node_modules/**,**/.next/**,public/**,**/*.d.ts
sonar.sourceEncoding=UTF-8
```

- [ ] **Step 2: Modificar o `Jenkinsfile` para adicionar as stages `SonarQube Analysis` e `Quality Gate`**

Estado atual do arquivo (`Jenkinsfile`, 21 linhas):

```groovy
pipeline {
    agent any

    tools {
        nodejs 'node-20'
    }

    stages {
        stage('Install dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }
    }
}
```

Substituir pelo conteúdo completo abaixo (adiciona as duas novas stages depois de `Build`, mantendo `Install dependencies` e `Build` inalteradas):

```groovy
pipeline {
    agent any

    tools {
        nodejs 'node-20'
    }

    stages {
        stage('Install dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

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
    }
}
```

- [ ] **Step 3: Validar a sintaxe Groovy do `Jenkinsfile` localmente**

Não há linter de Jenkinsfile instalado no ambiente local nem acesso configurado à API do Jenkins para validação remota (`pipeline-model-converter/validate`). A validação real de sintaxe/comportamento acontece no Step 5 (execução real no Jenkins). Antes de prosseguir, releia o arquivo alterado e confirme visualmente:
- Chaves `{ }` balanceadas (mesma contagem do arquivo original + 2 stages novas).
- Nomes de stage entre aspas simples, consistentes com as stages existentes (`'SonarQube Analysis'`, `'Quality Gate'`).
- `withSonarQubeEnv('SonarQube')` usa o mesmo nome cadastrado em *Manage Jenkins → System → SonarQube servers*.

- [ ] **Step 4: Commit**

```bash
git add sonar-project.properties Jenkinsfile
git commit -m "feat: adiciona análise SonarQube ao pipeline Jenkins"
```

- [ ] **Step 5: Push e validação end-to-end no Jenkins (teste real desta task)**

Como esta é uma mudança de infraestrutura de CI (não há suite de testes automatizados para simular localmente), o teste real é uma execução completa do pipeline:

```bash
git push origin HEAD
```

Depois, abra (ou atualize) o PR correspondente no GitHub e acompanhe o build disparado automaticamente no Jenkins (mesmo job multibranch que já rodou a PR-3 com sucesso). Confirme, no console output do Jenkins:

1. As stages `Install dependencies` e `Build` continuam passando como antes.
2. A stage `SonarQube Analysis` aparece, executa `npx --yes @sonar/scan` e termina sem erro (deve haver uma linha como `EXECUTION SUCCESS` no output do scanner).
3. A stage `Quality Gate` aparece e finaliza **antes** do timeout de 5 minutos — se ela expirar no timeout em vez de reportar `Quality Gate: OK` ou `Quality Gate: ERROR`, o webhook do Sonar não está entregando corretamente (revisar `Administration → Configuration → Webhooks` no Sonar, não é um bug do `Jenkinsfile`).
4. No painel do SonarQube (`https://devops-innovacao-sonarqube.pqluhr.easypanel.host`), o projeto `lp-comunidade` mostra uma nova análise com issues listadas (bugs/vulnerabilidades/code smells).

Se o Quality Gate reprovar por causa da condição de cobertura padrão (ausência de testes), isso é esperado até o ajuste manual do Quality Gate no painel do Sonar (fora de escopo desta task) — não é falha desta implementação.

---

## Self-Review

**Spec coverage:** `sonar-project.properties` (Step 1), stages `SonarQube Analysis` + `Quality Gate` no `Jenkinsfile` com `@sonar/scan` e `abortPipeline: true` (Step 2), validação end-to-end (Step 5) cobrem integralmente o spec de 2026-07-21. Itens marcados "fora de escopo" no spec (cobertura, PR decoration, testes automatizados) não têm task correspondente — corretamente, pois não deveriam.

**Placeholder scan:** nenhum "TBD"/"implementar depois" — todo conteúdo de arquivo é literal e completo.

**Type consistency:** N/A (sem funções/tipos compartilhados entre tasks — task única, sem interfaces entre steps).
