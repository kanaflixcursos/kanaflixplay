/**
 * Pure formatting & validation utilities for the checkout/payment flow.
 * No business-logic calculations — prices come from the server.
 */

// ─── Currency ─────────────────────────────────────────────────────

export function formatPriceBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

// ─── Document (CPF / CNPJ) ────────────────────────────────────────

export function formatDocument(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false; // all same digit

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (parseInt(digits[9]) !== check) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  return parseInt(digits[10]) === check;
}

export function isValidCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * weights1[i];
  let check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (parseInt(digits[12]) !== check) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(digits[i]) * weights2[i];
  check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return parseInt(digits[13]) === check;
}

export function isValidDocument(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length === 11 ? isValidCPF(value) : digits.length === 14 ? isValidCNPJ(value) : false;
}

// ─── Card ─────────────────────────────────────────────────────────

export function formatCardNumber(value: string): string {
  return value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim();
}

export function cleanCardNumber(value: string): string {
  return value.replace(/\s/g, '');
}

// ─── Phone ────────────────────────────────────────────────────────

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
}

// ─── CEP ──────────────────────────────────────────────────────────

export function formatCep(value: string): string {
  return value.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2');
}

// ─── Duration (for lesson display on checkout) ────────────────────

export function formatLessonDuration(minutes: number): string {
  if (minutes >= 60) {
    return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`;
  }
  return `${minutes}min`;
}
