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
│   ├── components/          # Componentes React reutilizáveis
│   │   ├── CTASection.tsx              # Seção de Call-to-Action final
│   │   ├── FeaturesSection.tsx         # Seção de características (não utilizada)
│   │   ├── HeroSection.tsx             # Seção hero principal
│   │   ├── InnovaNationSection.tsx     # Seção explicativa da InnovaNation
│   │   ├── MiniFooter.tsx              # Rodapé da página
│   │   ├── Navbar.tsx                  # Barra de navegação fixa
│   │   ├── ParticlesBackground.tsx     # Fundo animado com partículas
│   │   ├── RegistrationFormSection.tsx # Formulário de inscrição
│   │   ├── TestimonialsSection.tsx     # Seção de depoimentos
│   │   └── WhatsAppButton.tsx          # Botão de WhatsApp reutilizável
│   ├── config/
│   │   └── whatsapp.ts                 # Configuração do WhatsApp
│   ├── globals.css                     # Estilos globais e fontes
│   ├── layout.tsx                      # Layout raiz da aplicação
│   └── page.tsx                        # Página principal
├── public/
│   ├── Poppins/                        # Arquivos de fonte Poppins (TTF)
│   └── logo_innovatis.png             # Logo da empresa
├── next.config.ts                      # Configuração do Next.js
├── tailwind.config.js                  # Configuração do Tailwind CSS
├── tsconfig.json                       # Configuração do TypeScript
└── package.json                        # Dependências do projeto
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

3. Configure o WhatsApp:
   - Edite o arquivo `app/config/whatsapp.ts`
   - Substitua `phoneNumber` pelo seu número do WhatsApp Business
   - Formato: código do país + DDD + número (ex: `5511999999999`)

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

## 📞 Integração WhatsApp

A landing page integra com WhatsApp através de uma **URA (Unidade de Resposta Audível)** que:

1. Recebe o usuário com mensagem automática
2. Orienta sobre a comunidade InnovaNation
3. Fornece informações sobre editais, captação de recursos e parcerias

### Configuração

Edite `app/config/whatsapp.ts` para personalizar:

- Número do WhatsApp Business
- Mensagens padrão para cada seção
- Textos de call-to-action

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

**Última atualização**: Dezembro 2024

