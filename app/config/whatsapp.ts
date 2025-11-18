/**
 * Configuração do WhatsApp
 * 
 * IMPORTANTE: Substitua o número abaixo pelo seu número real do WhatsApp
 * Formato: código do país + DDD + número (sem espaços ou caracteres especiais)
 * 
 * Exemplo Brasil: 5511999999999 (55 = Brasil, 11 = DDD, 999999999 = número)
 * 
 * Para encontrar seu número de WhatsApp Business:
 * 1. Abra o WhatsApp Business
 * 2. Vá em Configurações > Dados da Empresa
 * 3. Copie o número completo com código do país
 */

export const whatsappConfig = {
  // Substitua pelo seu número do WhatsApp (formato: código do país + DDD + número)
  phoneNumber: '5511999999999',
  
  // Mensagem padrão que será enviada quando o usuário clicar no botão
  defaultMessage: 'Olá! Vi sua landing page e gostaria de saber mais sobre seus serviços.',
  
  // Mensagens personalizadas para diferentes seções
  messages: {
    hero: 'Olá! Gostaria de saber mais sobre a gestão estratégica de projetos da Innovatis e como vocês podem ajudar minha instituição/organização.',
    cta: 'Olá! Tenho interesse em conhecer como a Innovatis pode ajudar na captação e gestão de projetos estratégicos. Podemos conversar?',
  }
}

