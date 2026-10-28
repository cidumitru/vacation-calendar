import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import { useTheme, type Theme } from '@/components/theme-provider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const OPTIONS: { value: Theme; label: string; Icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
  { value: 'system', label: 'System', Icon: MonitorIcon },
];

/** Light, dark or system appearance as one row of three, for the Settings popover. */
export function ThemeToggle({ labelledBy }: { labelledBy?: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      spacing={0}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : 'Appearance'}
      className="w-full"
      value={theme}
      onValueChange={(v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setTheme(v);
      }}
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <ToggleGroupItem key={value} value={value} className="flex-1" aria-label={label}>
          <Icon />
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
