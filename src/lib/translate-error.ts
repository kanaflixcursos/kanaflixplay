/**
 * Translates common Supabase/API error messages to Portuguese.
 */
const errorMap: Record<string, string> = {
  'invalid login credentials': 'Email ou senha incorretos.',
  'email not confirmed': 'Email não confirmado. Verifique sua caixa de entrada.',
  'user already registered': 'Este email já está cadastrado.',
  'new password should be different from the old password': 'A nova senha deve ser diferente da senha anterior.',
  'password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
  'email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  'for security purposes, you can only request this after': 'Por segurança, aguarde alguns segundos antes de tentar novamente.',
  'signup is disabled': 'O cadastro está temporariamente desativado.',
  'user not found': 'Usuário não encontrado.',
  'token has expired or is invalid': 'O link expirou ou é inválido. Solicite um novo.',
  'unable to validate email address: invalid format': 'Formato de email inválido.',
  'password is too short': 'A senha é muito curta.',
  'auth session missing': 'Sessão expirada. Faça login novamente.',
};

export function translateError(message: string): string {
  if (!message) return 'Ocorreu um erro inesperado.';

  const lower = message.toLowerCase();

  for (const [key, value] of Object.entries(errorMap)) {
    if (lower.includes(key)) {
      return value;
    }
  }

  return message;
}
