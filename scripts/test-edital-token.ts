/**
 * Script para testar o módulo lib/edital-auth.ts
 * Executar com: npx tsx scripts/test-edital-token.ts
 */

import { createEditalToken, verifyEditalToken } from '../lib/edital-auth';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FALHOU: ${message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`✅ ${message}`);
}

// 1. Round-trip válido
const token = createEditalToken(42);
const decoded = verifyEditalToken(token);
assert(decoded === 42, 'token válido decodifica para o registrationId original');

// 2. Token adulterado (assinatura não bate)
const [payloadPart] = token.split('.');
const tamperedToken = `${payloadPart}.assinatura-invalida`;
assert(verifyEditalToken(tamperedToken) === null, 'token com assinatura adulterada é rejeitado');

// 3. Payload adulterado (muda o registrationId mas mantém a assinatura antiga)
const fakePayload = Buffer.from(JSON.stringify({ registrationId: 999, iat: 0, exp: 9999999999 })).toString('base64url');
const [, originalSignature] = token.split('.');
const forgedToken = `${fakePayload}.${originalSignature}`;
assert(verifyEditalToken(forgedToken) === null, 'payload adulterado com assinatura antiga é rejeitado');

// 4. Formato inválido
assert(verifyEditalToken('token-sem-ponto') === null, 'token sem separador "." é rejeitado');
assert(verifyEditalToken('') === null, 'string vazia é rejeitada');

// 5. Token expirado — avança o relógio 2h além do TTL de 1h e confere que o token deixa de ser válido
const realDateNow = Date.now.bind(Date);
const twoHoursMs = 2 * 60 * 60 * 1000;
Date.now = () => realDateNow() + twoHoursMs;
try {
  assert(verifyEditalToken(token) === null, 'token expira depois de passado o TTL de 1h');
} finally {
  Date.now = realDateNow;
}

console.log('\nVerificação concluída.');
