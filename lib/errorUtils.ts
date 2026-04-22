
import { toast } from 'react-hot-toast';

export const handleServiceError = (error: any, context: string) => {
  console.error(`Error in ${context}:`, error);
  
  const message = error.message || 'Ocorreu um erro inesperado';
  
  // Custom messages based on Postgres/Supabase codes
  if (error.code === '23505') {
    toast.error('Este registro já existe (duplicado).');
  } else if (error.code === '42P01') {
    toast.error('Tabela não encontrada no banco de dados.');
  } else {
    toast.error(`${context}: ${message}`);
  }
  
  throw error;
};
