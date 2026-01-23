import React from 'react';
import { Input } from '@/components/ui/input';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}

export default function PhoneInput({ value, onChange, placeholder = "(00) 00000-0000", id, className }: PhoneInputProps) {
  const formatPhone = (input: string): string => {
    // Remove all non-digits
    const digits = input.replace(/\D/g, '');
    
    // Limit to 11 digits (Brazilian mobile)
    const limited = digits.slice(0, 11);
    
    // Format based on length
    if (limited.length === 0) {
      return '';
    } else if (limited.length <= 2) {
      return `(${limited}`;
    } else if (limited.length <= 7) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    } else {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    onChange(formatted);
  };

  return (
    <Input
      id={id}
      type="tel"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      maxLength={16}
      className={className}
    />
  );
}
