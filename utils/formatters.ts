/**
 * Formata um CNPJ no padrão XX.XXX.XXX/XXXX-XX
 * @param value String contendo o CNPJ (formatado ou não)
 * @returns CNPJ formatado
 */
export const formatCNPJ = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  const limited = digits.slice(0, 14);
  
  if (limited.length <= 2) return limited;
  if (limited.length <= 5) return `${limited.slice(0, 2)}.${limited.slice(2)}`;
  if (limited.length <= 8) return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5)}`;
  if (limited.length <= 12) return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8)}`;
  return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8, 12)}-${limited.slice(12)}`;
};

/**
 * Formata um telefone brasileiro no padrão (XX) XXXX-XXXX ou (XX) XXXXX-XXXX
 * Trata também o prefixo DDI +55 (Brasil)
 * @param value String contendo o telefone (formatado ou não)
 * @returns Telefone formatado
 */
export const formatPhoneBR = (value: string): string => {
  // 1. Remove tudo que não for dígito
  let digits = value.replace(/\D/g, '');

  // 2. Se começar com 55 e tiver 12 ou 13 dígitos (DDI + DDD + número)
  //    remove os dois primeiros dígitos (55)
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }

  // 3. Limita a 11 dígitos (DDD + número celular)
  const limited = digits.slice(0, 11);
  
  if (limited.length === 0) return '';
  
  // 4. Aplicação parcial (enquanto o usuário está digitando)
  if (limited.length <= 2) return limited;
  if (limited.length <= 6) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  
  if (limited.length <= 10) {
    // Fixo: (XX) XXXX-XXXX
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
  }
  
  // Celular: (XX) XXXXX-XXXX
  return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7, 11)}`;
};
