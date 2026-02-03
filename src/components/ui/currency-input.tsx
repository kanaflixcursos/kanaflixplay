import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, prefix = "R$", ...props }, ref) => {
    const formatCurrency = (numericValue: string): string => {
      const numbers = numericValue.replace(/\D/g, '');
      if (!numbers) return '';
      
      const cents = parseInt(numbers, 10);
      const reais = cents / 100;
      
      return reais.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const numbers = inputValue.replace(/\D/g, '');
      
      if (!numbers) {
        onChange('');
        return;
      }
      
      const cents = parseInt(numbers, 10);
      const reais = cents / 100;
      onChange(reais.toFixed(2));
    };

    const displayValue = React.useMemo(() => {
      if (!value) return '';
      const numericValue = parseFloat(value);
      if (isNaN(numericValue)) return '';
      const cents = Math.round(numericValue * 100);
      return formatCurrency(cents.toString());
    }, [value]);

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">
          {prefix}
        </span>
        <input
          type="text"
          inputMode="numeric"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className,
          )}
          ref={ref}
          value={displayValue}
          onChange={handleChange}
          {...props}
        />
      </div>
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
