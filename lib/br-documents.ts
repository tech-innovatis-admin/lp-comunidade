/**
 * Validação e formatação de documentos brasileiros (client-safe, sem dependências Node).
 */

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatCNPJ(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);

  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return digits.replace(/(\d{2})(\d+)/, '$1.$2');
  if (digits.length <= 8) return digits.replace(/(\d{2})(\d{3})(\d+)/, '$1.$2.$3');
  if (digits.length <= 12) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d+)/, '$1.$2.$3/$4');
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function isValidCNPJ(cnpj: string): boolean {
  const cleanCNPJ = onlyDigits(cnpj);

  if (cleanCNPJ.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;

  const calcDigit = (base: string, weights: number[]): number => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      sum += parseInt(base[i], 10) * weights[i];
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const base = cleanCNPJ.slice(0, 12);
  const d1 = calcDigit(base, weights1);
  const d2 = calcDigit(base + d1.toString(), weights2);
  const cnpjCalculated = base + d1.toString() + d2.toString();

  return cleanCNPJ === cnpjCalculated;
}

/** 14 dígitos presentes e checksum inválido. Vazio ou incompleto não bloqueia rascunho. */
export function isInstituicaoCnpjBlocking(cnpj: string): boolean {
  const digits = onlyDigits(cnpj);
  return digits.length === 14 && !isValidCNPJ(digits);
}
