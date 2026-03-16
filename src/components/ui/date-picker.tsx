import * as React from "react";
import { format, parse, isValid, setMonth, setYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  /** Show month/year selectors for birth dates etc */
  showMonthYearPicker?: boolean;
}

function parseDate(value?: string | Date): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return isValid(value) ? value : undefined;
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? parsed : undefined;
}

const months = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function DatePicker({
  value,
  onChange,
  placeholder = "Selecionar data",
  maxDate,
  minDate,
  disabled = false,
  className,
  id,
  showMonthYearPicker = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseDate(value);
  const [displayMonth, setDisplayMonth] = React.useState<Date>(
    selected || new Date()
  );

  React.useEffect(() => {
    if (selected) setDisplayMonth(selected);
  }, [selected]);

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

  const currentYear = new Date().getFullYear();
  const minYear = minDate ? minDate.getFullYear() : currentYear - 120;
  const maxYear = maxDate ? maxDate.getFullYear() : currentYear + 10;
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);

  const handleMonthChange = (monthStr: string) => {
    setDisplayMonth(setMonth(displayMonth, parseInt(monthStr)));
  };

  const handleYearChange = (yearStr: string) => {
    setDisplayMonth(setYear(displayMonth, parseInt(yearStr)));
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
        {showMonthYearPicker && (
          <div className="flex items-center gap-2 px-3 pt-3 pb-1">
            <Select value={String(displayMonth.getMonth())} onValueChange={handleMonthChange}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m, i) => (
                  <SelectItem key={i} value={String(i)} className="text-xs">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(displayMonth.getFullYear())} onValueChange={handleYearChange}>
              <SelectTrigger className="h-8 text-xs w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          disabled={disabledDays}
          month={displayMonth}
          onMonthChange={setDisplayMonth}
          initialFocus
          locale={ptBR}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}