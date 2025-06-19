import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export function ThemedSelect({ 
  label, 
  error, 
  options = [],
  className,
  containerClassName,
  placeholder = "Select an option",
  ...props 
}) {
  return (
    <div className={cn("space-y-2", containerClassName)}>
      {label && (
        <Label className="text-lg font-semibold text-white">
          {label}
        </Label>
      )}
      <Select {...props}>
        <SelectTrigger className={cn(theme.components.input.base, className)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-600">
          {options.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              className="text-white hover:bg-gray-700 focus:bg-gray-700"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
    </div>
  );
}