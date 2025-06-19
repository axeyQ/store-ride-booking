import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export function ThemedCard({ 
  children, 
  title, 
  description, 
  className, 
  hover = false,
  gradient = false,
  colorScheme = 'default',
  ...props 
}) {
  const cardClasses = cn(
    theme.components.card.base,
    hover && theme.components.card.hover,
    gradient && theme.backgrounds.card,
    className
  );

  if (title || description) {
    return (
      <Card className={cardClasses} {...props}>
        {(title || description) && (
          <CardHeader>
            {title && <CardTitle className={theme.typography.title}>{title}</CardTitle>}
            {description && <CardDescription className="text-gray-400">{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent className="text-white">
          {children}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cardClasses} {...props}>
      <CardContent className="p-6 text-white">
        {children}
      </CardContent>
    </Card>
  );
}