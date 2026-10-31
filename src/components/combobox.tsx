import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface ComboboxProps {
  id?: string;
  'aria-label'?: string;
  value: string;
  /** In the order given until a search narrows them; the one whose code is the value is ticked. */
  options: { code: string; name: string }[];
  /** The search box's placeholder. */
  placeholder: string;
  /** Shown when nothing matches the search. */
  empty: string;
  disabled?: boolean;
  className?: string;
  onChange: (code: string) => void;
}

/** A button showing the chosen option that opens a searchable list; the search matches names and codes. */
export function Combobox({ id, 'aria-label': ariaLabel, value, options, placeholder, empty, disabled, className, onChange }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.code === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} aria-label={ariaLabel} variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className={cn('w-full justify-between font-normal', className)}>
          <span className="truncate">{current?.name ?? value}</span>
          <ChevronsUpDownIcon className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>{empty}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.code}
                  value={`${o.name} ${o.code}`}
                  onSelect={() => {
                    onChange(o.code);
                    setOpen(false);
                  }}
                >
                  {o.name}
                  <CheckIcon className={cn('ml-auto', o.code === value ? 'opacity-100' : 'opacity-0')} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
