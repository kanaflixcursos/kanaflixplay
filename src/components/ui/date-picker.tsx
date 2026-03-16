import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  /** Date as ISO string (yyyy-MM-dd) or Date object */
  value?: string | Date;
  /** Called with ISO string yyyy-MM-dd */
  onChange?: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Disable dates after this */
  maxDate?: Date;
  /** Disable dates before this */
  minDate?: Date;
  /** Disabled state */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
  /** ID for label association */
  id?: string;
}

function parseDate(value?: string | Date): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return isValid(value) ? value : undefined;
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? parsed : undefined;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Selecionar data",
  maxDate,
  minDate,
  disabled = false,
  className,
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseDate(value);

  const handleSelect = (date: Date | undefined) => {
    if (date && onChange) {
      onChange(format(date, "yyyy-MM-dd"));
    }
    setOpen(false);
  };

  const disabledDays = (date: Date) => {
    if (maxDate && date > maxDate) return true;
    if (minDate && date < minDate) return true;
    return false;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-10",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected
            ? format(selected, "dd/MM/yyyy", { locale: ptBR })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          disabled={disabledDays}
          defaultMonth={selected}
          initialFocus
          locale={ptBR}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
