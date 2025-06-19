import { Button } from '@/components/ui/button';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export function ThemedButton({ 
  children, 
  variant = 'primary', 
  size = 'default',
  className,
  icon,
  ...props 
}) {
  const buttonClass = cn(
    theme.components.button[variant] || theme.components.button.primary,
    size === 'sm' && 'min-h-[44px] px-6 py-2 text-base',
    size === 'lg' && 'min-h-[72px] px-12 py-6 text-xl',
    className
  );

  return (
    <Button className={buttonClass} {...props}>
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </Button>
  );
}