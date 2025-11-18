# 🚀 Guia de Configuração - Landing Page Instagram

## ⚙️ Configuração do WhatsApp

### Passo 1: Configurar o Número do WhatsApp

1. Abra o arquivo `app/config/whatsapp.ts`
2. Substitua o número `5511999999999` pelo seu número real do WhatsApp Business
3. Formato: código do país + DDD + número (sem espaços ou caracteres especiais)

**Exemplo para Brasil:**
- Código do país: 55
- DDD: 11 (São Paulo)
- Número: 987654321
- **Resultado:** `5511987654321`

### Passo 2: Personalizar Mensagens

No mesmo arquivo, você pode personalizar as mensagens que serão enviadas:

```typescript
messages: {
  hero: 'Sua mensagem personalizada aqui',
  cta: 'Outra mensagem personalizada',
}
```

## 📱 Testando no Mobile

1. Execute o projeto: `npm run dev`
2. Acesse pelo seu celular na mesma rede Wi-Fi:
   - Encontre o IP do seu computador
   - Acesse: `http://SEU_IP:3000`
3. Ou use ferramentas como ngrok para criar um link público temporário

## 🎨 Personalização

### Cores e Estilos
- Cores principais estão em `app/globals.css`
- Cor do WhatsApp: `#25D366` (verde oficial)
- Cor de fundo: `#121826` (dark)

### Textos
- Hero Section: `app/components/HeroSection.tsx`
- Features: `app/components/FeaturesSection.tsx`
- Depoimentos: `app/components/TestimonialsSection.tsx`
- CTA Final: `app/components/CTASection.tsx`

### Logo
- Substitua `/public/logo_innovatis.png` pelo seu logo
- Tamanho recomendado: 200x60px (ou proporcional)

## 🚀 Deploy

### Vercel (Recomendado)
1. Conecte seu repositório no GitHub
2. Importe na Vercel
3. Deploy automático a cada push

### Outras Plataformas
- Netlify
- Railway
- AWS Amplify

## ✅ Checklist Antes de Publicar

- [ ] Número do WhatsApp configurado corretamente
- [ ] Mensagens personalizadas
- [ ] Logo atualizado
- [ ] Textos revisados
- [ ] Testado no mobile
- [ ] Testado o botão WhatsApp
- [ ] Metadados atualizados (SEO)

## 📞 Suporte

Para dúvidas ou problemas, consulte a documentação do Next.js ou entre em contato com a equipe de desenvolvimento.

