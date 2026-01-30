import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Switch } from "@/components/ui/switch";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const handleToggle = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  return (
    <div className="flex items-center justify-between w-full px-3 py-2">
      <div className="flex items-center gap-2">
        {isDark ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
        <span className="text-sm">Modo Escuro</span>
      </div>
      <Switch
        checked={isDark}
        onCheckedChange={handleToggle}
        aria-label="Alternar modo escuro"
      />
    </div>
  );
}
