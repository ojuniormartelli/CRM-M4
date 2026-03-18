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
 * @param value String contendo o telefone (formatado ou não)
 * @returns Telefone formatado
 */
export const formatPhoneBR = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  const limited = digits.slice(0, 11);
  
  if (limited.length === 0) return '';
  if (limited.length <= 2) return `(${limited}`;
  if (limited.length <= 6) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  
  if (limited.length <= 10) {
    // Fixo: (XX) XXXX-XXXX
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
  }
  // Celular: (XX) XXXXX-XXXX
  return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
};
