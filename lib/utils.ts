/**
 * Utilitários gerais
 */

import * as crypto from 'crypto';

/**
 * Calcula hash SHA-256 de um texto
 */
export function calculateHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Gera token seguro para convites
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Valida formato de CPF
 */
export function isValidCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  const calcDigit = (base: string, factorStart: number): number => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      const digit = parseInt(base[i], 10);
      const factor = factorStart - i;
      sum += digit * factor;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const base = cleanCPF.slice(0, 9);
  const d1 = calcDigit(base, 10);
  const d2 = calcDigit(base + d1.toString(), 11);
  const cpfCalculated = base + d1.toString() + d2.toString();
  
  return cleanCPF === cpfCalculated;
}

/**
 * Valida formato de email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Obtém IP real do cliente (considerando proxies)
 * Remove prefixo IPv6 mapeado (::ffff:) e normaliza o IP
 */
export function getClientIP(headers: Headers | Record<string, string | string[] | undefined>): string {
  let ip: string | null = null;

  // Se for Headers do Next.js
  if (headers instanceof Headers) {
    const forwardedFor = headers.get('x-forwarded-for');
    const realIP = headers.get('x-real-ip');
    
    if (forwardedFor) {
      ip = forwardedFor.split(',')[0].trim();
    } else if (realIP) {
      ip = realIP;
    }
  } else {
    // Se for objeto de headers
    const forwardedFor = headers['x-forwarded-for'];
    const realIP = headers['x-real-ip'];
    
    if (forwardedFor) {
      ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      ip = ip.split(',')[0].trim();
    } else if (realIP) {
      ip = Array.isArray(realIP) ? realIP[0] : realIP;
    }
  }

  if (!ip || ip === 'unknown') {
    return 'unknown';
  }

  // Remove prefixo IPv6 mapeado (::ffff:)
  // Exemplo: ::ffff:192.168.10.197 -> 192.168.10.197
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  // Remove colchetes de IPv6 se houver
  // Exemplo: [::1] -> ::1
  ip = ip.replace(/^\[|\]$/g, '');

  // Se for localhost em IPv6, converte para IPv4
  if (ip === '::1' || ip === '::') {
    return '127.0.0.1';
  }

  return ip;
}

/**
 * Sanitiza string para evitar SQL injection (usar sempre prepared statements)
 */
export function sanitizeString(str: string): string {
  return str.trim();
}

/**
 * Calcula hash SHA-256 de um buffer (arquivo)
 * Usado para verificação de integridade de documentos
 */
export function calculateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

