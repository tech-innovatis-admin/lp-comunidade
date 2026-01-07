/**
 * Script para testar o webhook N8N
 * Executar com: node scripts/test-webhook.js
 */

const testData = {
  id: 999999,
  full_name: "João Silva Teste",
  email: "teste@exemplo.com",
  phone: "+55 11 99999-9999",
  cpf: "12345678901",
  profession: "Desenvolvedor",
  organization: "Empresa Teste",
  address: "Rua Teste, 123",
  projects: "Projetos de teste",
  status: "PENDING",
  document_view_url: "https://comunidade.innovatismc.com/api/documents/999999",
  document_hash: "abc123def456",
  document_size: 1024000,
  document_mime_type: "application/pdf",
  document_original_filename: "documento_teste.pdf",
  terms_version: "v1.0",
  terms_content_hash: "hash_dos_termos_123",
  registration_fingerprint: "fingerprint_teste_456",
  client_ip: "192.168.1.100",
  user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  accept_language: "pt-BR,pt;q=0.9,en;q=0.8",
  referer: "https://comunidade.innovatismc.com",
  x_forwarded_for: "192.168.1.100",
  sec_ch_ua: "\"Google Chrome\";v=\"119\", \"Chromium\";v=\"119\", \"Not-A.Brand\";v=\"24\"",
  sec_ch_ua_platform: "\"Windows\"",
  sec_ch_ua_mobile: "?0",
  variant: "MANUAL",
  created_at: new Date().toISOString()
};

async function testWebhook() {
  const webhookUrl = 'https://v1teste.app.n8n.cloud/webhook-test/kriscia-comunidade';

  console.log('🧪 Testando webhook N8N...');
  console.log('📤 URL:', webhookUrl);
  console.log('📊 Dados:', JSON.stringify(testData, null, 2));

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    console.log('📡 Status da resposta:', response.status);
    console.log('📝 Status text:', response.statusText);

    if (response.ok) {
      console.log('✅ Webhook funcionou corretamente!');
    } else {
      console.log('❌ Webhook falhou:', response.status, response.statusText);
    }

    // Tenta ler o corpo da resposta se houver
    try {
      const responseBody = await response.text();
      if (responseBody) {
        console.log('📄 Corpo da resposta:', responseBody);
      }
    } catch (e) {
      console.log('📄 Não foi possível ler o corpo da resposta');
    }

  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

// Executa o teste
testWebhook();
