import { Badge } from '@/components/ui/badge';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export function ThemedBadge({ 
  children, 
  status,
  color = 'cyan',
  variant = 'default',
  className,
  ...props 
}) {
  let badgeClass = className;
  
  if (status) {
    badgeClass = cn(theme.components.status[status], className);
  } else if (color && theme.colors.primary[color]) {
    badgeClass = cn(theme.colors.primary[color].badge, className);
  }

  return (
    <Badge className={badgeClass} {...props}>
      {children}
    </Badge>
  );
}