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

  // 2. Se começar com 55, remove para tratar uniformemente
  if (digits.startsWith('55')) {
    digits = digits.slice(2);
  }

  // 3. Limita a 11 dígitos (DDD + número)
  const limited = digits.slice(0, 11);
  
  if (limited.length === 0) return '';
  
  // 4. Aplicação do formato +55 (XX) XXXXX-XXXX
  if (limited.length <= 2) {
    return `+55 (${limited}`;
  }
  
  if (limited.length <= 6) {
    return `+55 (${limited.slice(0, 2)}) ${limited.slice(2)}`;
  }
  
  if (limited.length <= 10) {
    // Formato para fixo ou durante a digitação: +55 (XX) XXXX-XXXX
    return `+55 (${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
  }
  
  // Formato para celular: +55 (XX) XXXXX-XXXX
  return `+55 (${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
};

/**
 * Formata um valor numérico para o padrão de moeda BRL (R$)
 * @param value Valor numérico
 * @returns Valor formatado como moeda
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};
