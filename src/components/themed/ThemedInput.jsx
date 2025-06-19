import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export function ThemedInput({ 
  label, 
  error, 
  className,
  containerClassName,
  ...props 
}) {
  const inputClass = cn(
    theme.components.input.base,
    error && theme.components.input.error,
    className
  );

  return (
    <div className={cn("space-y-2", containerClassName)}>
      {label && (
        <Label className="text-lg font-semibold text-white">
          {label}
        </Label>
      )}
      <Input className={inputClass} {...props} />
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
    </div>
  );
}