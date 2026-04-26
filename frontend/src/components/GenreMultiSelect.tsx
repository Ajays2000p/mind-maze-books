import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface GenreMultiSelectProps {
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    singleSelect?: boolean;
}

export function GenreMultiSelect({
    options,
    selected,
    onChange,
    placeholder = "Select genres...",
    singleSelect = false
}: GenreMultiSelectProps) {
    const [open, setOpen] = React.useState(false);

    const handleUnselect = (item: string) => {
        onChange(selected.filter((i) => i !== item));
    };

    const handleSelect = (item: string) => {
        if (singleSelect) {
            if (selected.includes(item)) {
                onChange([]);
            } else {
                onChange([item]);
                setOpen(false);
            }
            return;
        }

        if (selected.includes(item)) {
            handleUnselect(item);
        } else {
            onChange([...selected, item]);
        }
    };

    const getDisplayTitle = () => {
        if (selected.length === 0) return placeholder;
        if (selected.length === 1) return selected[0];
        return `${selected[0]} + ${selected.length - 1}`;
    };

    return (

        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-9 text-sm font-normal text-muted-foreground border-dashed hover:border-primary/50 hover:bg-primary/5 transition-all overflow-hidden"
                >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                        <Plus className="h-4 w-4 shrink-0" />
                        <span className="truncate max-w-[130px] sm:max-w-[180px]">
                            {getDisplayTitle()}
                        </span>
                    </div>
                    {selected.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] hover:bg-transparent text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange([]);
                            }}
                        >
                            Clear all
                        </Button>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <Command className="bg-popover">
                    <CommandInput placeholder="Search genres..." className="h-8 text-xs" />
                    <CommandList className="max-h-[200px]">
                        <CommandEmpty className="py-2 text-xs text-center text-muted-foreground">No genre found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => {
                                const isSelected = selected.includes(option);
                                return (
                                    <CommandItem
                                        key={option}
                                        onSelect={() => handleSelect(option)}
                                        className="text-xs cursor-pointer"
                                    >
                                        <div
                                            className={cn(
                                                "mr-2 flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-primary transition-all",
                                                isSelected
                                                    ? "bg-primary text-primary-foreground"
                                                    : "opacity-50 [&_svg]:invisible"
                                            )}
                                        >
                                            <Check className={cn("h-3 w-3")} />
                                        </div>
                                        <span>{option}</span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
