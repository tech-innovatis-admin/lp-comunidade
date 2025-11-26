# Landing Page Innovatis - InnovaNation

Landing page profissional e responsiva desenvolvida para a **Innovatis**, focada em converter visitantes em membros da comunidade **InnovaNation** através de uma experiência otimizada para dispositivos móveis, especialmente para tráfego originado do Instagram.

## 📋 Sobre a Innovatis

A **Innovatis** é uma empresa especializada na **captação e gestão de projetos estratégicos**, atuando como um elo fundamental entre:

- 🎓 **Instituições acadêmicas** (universidades, faculdades, centros de pesquisa)
- 🏛️ **Órgãos governamentais** (municipais, estaduais e federais)
- 🏢 **Entidades públicas e privadas**
- 💼 **Fundações de apoio**

### Missão

Executar de forma eficiente projetos nas áreas de **educação**, **tecnologia**, **social** e **ambiental**, contribuindo para um impacto positivo e desenvolvendo soluções inovadoras que promovam o crescimento sustentável de comunidades, cidades e instituições educacionais.

### Visão

Ser a principal parceira estratégica entre instituições federais de Ensino Superior e governos (federais, estaduais e municipais), reconhecida por sua expertise em consultoria de gestão de projetos, impulsionando o progresso educacional, tecnológico e social.

### Valores

- **Comprometimento** com os objetivos dos clientes
- **Inovação** na busca por novas abordagens
- **Simplicidade** na tradução de complexidade em soluções acessíveis
- **Foco em Resultados** tangíveis que gerem impacto real

---

## 🌟 Sobre a Comunidade InnovaNation

A **InnovaNation** é uma **comunidade exclusiva** criada pela Innovatis para conectar profissionais, pesquisadores e instituições interessadas em:

### Benefícios da Comunidade

1. **📄 Editais de Fomento**
   - Acesso exclusivo a editais de financiamento atualizados
   - Oportunidades de financiamento para projetos de pesquisa e desenvolvimento

2. **💰 Captação de Recursos**
   - Oportunidades personalizadas para captação de recursos e investimentos
   - Suporte na elaboração de propostas e projetos

3. **🤝 Parcerias Estratégicas**
   - Conexões com instituições parceiras para desenvolvimento de projetos
   - Networking com organizações públicas e privadas

4. **👥 Networking**
   - Rede de contatos qualificados em diversos setores e áreas de atuação
   - Eventos e encontros exclusivos para membros

### Como Fazer Parte

Os interessados podem se inscrever através do formulário disponível na landing page, preenchendo informações pessoais e profissionais. Após a inscrição, os membros têm acesso a:

- Base de dados de editais vigentes
- Oportunidades de captação de recursos
- Plataforma de networking
- Suporte especializado da equipe Innovatis

---

## 🏗️ Estrutura do Projeto

```
landing-page-innovatis/
├── app/
│   ├── api/                            # API Routes (Backend)
│   │   ├── terms/
│   │   │   └── active/route.ts         # GET /api/terms/active
│   │   ├── inscricoes/
│   │   │   └── route.ts                 # POST /api/inscricoes
│   │   ├── convite/
│   │   │   └── [token]/route.ts        # GET /api/convite/:token
│   │   └── health/
│   │       └── route.ts                 # GET /api/health
│   ├── components/                      # Componentes React reutilizáveis
│   │   ├── CTASection.tsx              # Seção de Call-to-Action final
│   │   ├── ConfettiEffect.tsx          # Efeito de confete
│   │   ├── FeaturesSection.tsx         # Seção de características
│   │   ├── HeroSection.tsx             # Seção hero principal
│   │   ├── IdentityUploadSection.tsx   # Upload de documentos
│   │   ├── InnovaNationSection.tsx     # Seção explicativa da InnovaNation
│   │   ├── MiniFooter.tsx              # Rodapé da página
│   │   ├── Navbar.tsx                  # Barra de navegação fixa
│   │   ├── ParticlesBackground.tsx     # Fundo animado com partículas
│   │   ├── RegistrationFormSection.tsx # Formulário de inscrição (integrado com API)
│   │   ├── TermsModal.tsx              # Modal de termos (carrega da API)
│   │   ├── TestimonialsSection.tsx     # Seção de depoimentos
│   │   └── WhatsAppButton.tsx          # Botão de WhatsApp reutilizável
│   ├── convite/
│   │   └── [token]/page.tsx            # Página de redirecionamento para WhatsApp
│   ├── config/
│   │   └── whatsapp.ts                 # Configuração do WhatsApp
│   ├── globals.css                     # Estilos globais e fontes
│   ├── layout.tsx                      # Layout raiz da aplicação
│   └── page.tsx                        # Página principal
├── lib/                                 # Bibliotecas e utilitários
│   ├── db.ts                           # Pool de conexões PostgreSQL
│   ├── s3.ts                           # Serviço de upload AWS S3
│   ├── utils.ts                        # Utilitários (hash, validações)
│   └── api.ts                          # Cliente API (frontend)
├── database/
│   ├── migrations/                     # Migrations SQL
│   │   ├── 000_create_database.sql     # Criação do banco
│   │   ├── 001_create_tables.sql       # Estrutura completa
│   │   ├── 001_create_tables_simple.sql # Versão simplificada
│   │   └── 002_insert_initial_term.sql  # Termo inicial
│   └── terms/                          # Arquivos HTML dos termos
│       └── v1.0.html                   # Termo versão 1.0
├── scripts/                             # Scripts de automação
│   ├── setup-database.ts               # Setup automático do banco
│   ├── create-database.ts              # Criação de banco
│   ├── insert-term.ts                  # Inserção de termos
│   ├── migrate.sh                      # Script de migração
│   ├── update-env-db.js                # Atualização de .env
│   └── verify-setup.ps1                # Verificação de setup
├── public/
│   ├── Poppins/                        # Arquivos de fonte Poppins (TTF)
│   ├── logo_innovatis.png             # Logo da empresa
│   └── ...                             # Outros assets
├── next.config.ts                       # Configuração do Next.js
├── tailwind.config.js                  # Configuração do Tailwind CSS
├── tsconfig.json                       # Configuração do TypeScript
├── Dockerfile                          # Build Docker ARM64
├── package.json                        # Dependências do projeto
└── .env                                # Variáveis de ambiente (não versionado)
```

---

## 📝 Componente RegistrationFormSection.tsx

O componente `RegistrationFormSection.tsx` é responsável por coletar informações dos usuários interessados em se tornar membros da comunidade InnovaNation.

### Funcionalidades

#### Campos do Formulário

1. **Nome Completo** (obrigatório)
   - Campo de texto simples
   - Validação: não pode estar vazio

2. **Profissão** (obrigatório)
   - Campo de texto simples
   - Validação: não pode estar vazio

3. **CPF** (obrigatório)
   - Campo de texto com formatação automática
   - Formato: `000.000.000-00`
   - Validação: deve conter exatamente 11 dígitos

4. **Número de Celular** (obrigatório)
   - Campo de texto com formatação automática
   - Formato: `(00) 00000-0000`
   - Validação: deve conter pelo menos 10 dígitos

5. **E-mail** (obrigatório)
   - Campo de tipo email
   - Validação: formato de e-mail válido

6. **Endereço** (obrigatório)
   - Campo textarea
   - Validação: não pode estar vazio

7. **Nome(s) do(s) Projeto(s)** (opcional)
   - Campo textarea
   - Permite múltiplos projetos separados por vírgula
   - Não é obrigatório para envio do formulário

#### Termos e Condições

O formulário inclui três checkboxes obrigatórios:

1. **Termos de Uso** - Aceite dos termos de uso da plataforma
2. **Política de Privacidade** - Autorização para tratamento de dados pessoais
3. **Termos da Comunidade InnovaNation** - Aceite dos termos específicos da comunidade

### Validação

- **Validação em tempo real**: Os erros são limpos quando o usuário começa a digitar
- **Validação no submit**: Todos os campos obrigatórios são validados antes do envio
- **Botão dinâmico**: O botão "Finalizar Inscrição" fica desabilitado (cinza) até que todos os campos obrigatórios estejam preenchidos corretamente e todos os termos sejam aceitos
- **Feedback visual**: Campos com erro são destacados em vermelho

### Estados do Botão

- **Desabilitado (cinza)**: Quando o formulário não está válido
- **Habilitado (verde)**: Quando todos os campos obrigatórios estão preenchidos e termos aceitos
- **Enviando**: Estado de loading durante o envio

### Formatação Automática

- **CPF**: Formatação automática durante a digitação (`000.000.000-00`)
- **Telefone**: Formatação automática durante a digitação (`(00) 00000-0000`)

### Tecnologias Utilizadas

- **React Hooks**: `useState` para gerenciamento de estado
- **TypeScript**: Tipagem estática para maior segurança
- **Lucide React**: Ícones SVG profissionais
- **Tailwind CSS**: Estilização responsiva

### Exemplo de Uso

```tsx
import RegistrationFormSection from './components/RegistrationFormSection'

export default function Page() {
  return (
    <div>
      <RegistrationFormSection />
    </div>
  )
}
```

---

## 🛠️ Tecnologias Utilizadas

### Framework e Bibliotecas Principais

- **Next.js 15.4.3** - Framework React com SSR e otimizações
- **React 19.1.0** - Biblioteca JavaScript para interfaces
- **TypeScript 5** - Superset JavaScript com tipagem estática
- **Tailwind CSS 4** - Framework CSS utility-first

### Backend e Banco de Dados

- **PostgreSQL** - Banco de dados relacional (RDS AWS)
- **pg** - Cliente PostgreSQL para Node.js
- **AWS SDK v3** - Integração com S3 para upload de arquivos
- **dotenv** - Gerenciamento de variáveis de ambiente

### Bibliotecas de UI e Efeitos

- **Lucide React** - Ícones SVG modernos e profissionais
- **react-tsparticles** - Partículas animadas para background
- **Three.js** - Renderização 3D (para efeitos avançados)

### Fontes

- **Poppins** - Fonte local carregada de `/public/Poppins/`
  - Suporta pesos: 100 (Thin) até 900 (Black)
  - Otimizada com `font-display: swap`

---

## 🚀 Como Executar o Projeto

### Pré-requisitos

- Node.js 18+ instalado
- npm ou yarn

### Instalação

1. Clone o repositório:
```bash
git clone <url-do-repositorio>
cd landing-page-innovatis
```

2. Instale as dependências:
```bash
npm install
# ou
yarn install
```

3. Configure as variáveis de ambiente:
   - Copie `env.example` para `.env`
   - Configure credenciais do banco PostgreSQL (RDS AWS)
   - Configure credenciais AWS S3
   - Configure `WHATSAPP_GROUP_INVITE_URL` (link do grupo)
   - Configure `PUBLIC_BASE_URL` (URL pública da aplicação)

4. Execute o servidor de desenvolvimento:
```bash
npm run dev
# ou
yarn dev
```

5. Acesse no navegador:
```
http://localhost:3000
```

### Build para Produção

```bash
npm run build
npm start
```

---

## 📱 Responsividade

A landing page foi desenvolvida com foco em **mobile-first**, otimizada para:

- 📱 **Dispositivos móveis** (smartphones)
- 📱 **Tablets**
- 💻 **Desktops**

### Otimizações Mobile

- Partículas reduzidas em dispositivos móveis para melhor performance
- Layout adaptativo com Tailwind CSS
- Touch-friendly (áreas de toque otimizadas)
- Fontes escaláveis e legíveis em telas pequenas

---

## 🎨 Design e UX

### Paleta de Cores

- **Fundo**: `#121826` (azul escuro)
- **WhatsApp Verde**: `#25D366` (destaque principal)
- **Texto Principal**: Branco/Cinza claro
- **Cards**: Gradientes escuros com transparência

### Hierarquia Tipográfica

- **Títulos H1**: `font-extrabold` (800) - Poppins
- **Títulos H2**: `font-bold` (700) - Poppins
- **Subtítulos**: `font-semibold` (600) ou `font-medium` (500) - Poppins
- **Corpo**: `font-normal` (400) ou `font-light` (300) - Poppins

### Animações

- Fade-in suave para elementos
- Hover effects em cards e botões
- Partículas animadas no background
- Transições suaves em todas as interações

---

## 🔗 Sistema de Links Únicos para WhatsApp

A landing page implementa um sistema de **links únicos rastreáveis** para acesso ao grupo WhatsApp:

### Como Funciona

1. **Inscrição**: Pessoa preenche formulário e se inscreve
2. **Geração de Token**: Sistema gera token único (64 caracteres)
3. **Link Único**: Pessoa recebe `https://comunidade.innovatis.com/convite/{token}`
4. **Rastreamento**: Ao clicar, sistema registra IP, data/hora, navegador
5. **Redirecionamento**: Sistema redireciona para link oficial do grupo WhatsApp
6. **Expiração**: Link não pode ser usado novamente (one-time use)

### Limitação do WhatsApp

⚠️ **Importante**: O WhatsApp **não oferece** API oficial para criar links únicos que expiram automaticamente. Nosso sistema implementa:
- ✅ Link único interno por pessoa
- ✅ Rastreamento completo
- ✅ Expiração após primeiro uso
- ❌ Mas o link oficial do grupo continua sendo o mesmo para todos

**Solução recomendada**: Configurar grupo WhatsApp para exigir aprovação do admin.

### Configuração

Edite `.env`:
```env
WHATSAPP_GROUP_INVITE_URL=https://chat.whatsapp.com/SEU_CODIGO_DO_GRUPO
PUBLIC_BASE_URL=https://comunidade.innovatis.com
INVITE_ONE_TIME_USE=true
```

---

## 🗄️ Backend e Banco de Dados

### Estrutura do Banco

- **Banco**: `landing_page_comunidade` (PostgreSQL RDS AWS)
- **Tabelas**:
  - `terms_of_use` - Versionamento de termos com hash SHA-256
  - `registrations` - Inscrições com registro jurídico completo
  - `registration_invites` - Links únicos para WhatsApp

### Registro Jurídico

Cada aceite de termos registra:
- Dados pessoais (nome, CPF, e-mail, documento)
- Timestamp do servidor (UTC)
- IP de origem
- User-Agent (navegador/dispositivo)
- Versão exata dos termos aceitos
- Hash SHA-256 do conteúdo (integridade)

**Status**: ✅ Sistema profissional e juridicamente válido

### Upload de Documentos

- **Storage**: AWS S3 (`innovanation-documents`)
- **Validações**: JPG, PNG, PDF (máx. 10MB)
- **Estrutura**: `documents/{timestamp}-{hash}.{ext}`

---

## 📡 API Endpoints

### `GET /api/terms/active`
Retorna termos de uso ativos para exibição no frontend.

### `POST /api/inscricoes`
Recebe inscrições completas com upload de documentos.

### `GET /api/convite/:token`
Redireciona para WhatsApp usando token único.

### `GET /api/health`
Verifica saúde do sistema (banco, S3, termos).

---

## ⚠️ Gaps Pendentes

### 1. Fluxo de Aprovação WhatsApp
**Status**: Aguardando decisão sobre como gerenciar convites ao grupo.

### 2. Sistema de Análise de Inscrições
**Status**: Aguardando decisão sobre interface/ferramenta para revisar inscrições.

Veja `STATUS_DESENVOLVIMENTO.md` para detalhes completos.

---

## 📄 Licença

Este projeto é propriedade da **Innovatis** e está protegido por direitos autorais.

---

## 👥 Desenvolvido por

**Data Science Team - Innovatis MC**

---

## 📧 Contato

Para mais informações sobre a Innovatis ou a comunidade InnovaNation, entre em contato através do WhatsApp disponível na landing page.

---

---

## 📚 Documentação Adicional

- **[STATUS_DESENVOLVIMENTO.md](./STATUS_DESENVOLVIMENTO.md)** - Status completo do desenvolvimento e gaps pendentes
- **[BACKEND.md](./BACKEND.md)** - Documentação técnica completa do backend
- **[STATUS_SETUP.md](./STATUS_SETUP.md)** - Status de configuração e setup
- **[PROXIMOS_PASSOS.md](./PROXIMOS_PASSOS.md)** - Próximos passos para finalização

---

**Última atualização**: 24 de Novembro de 2025

