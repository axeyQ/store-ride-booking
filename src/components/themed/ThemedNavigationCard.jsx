import Link from 'next/link';
import { ThemedCard } from './ThemedCard';
import { ThemedBadge } from './ThemedBadge';
import { theme } from '@/lib/theme';

export function ThemedNavigationCard({ 
  href, 
  title, 
  description, 
  icon,
  iconColor = 'cyan',
  badge,
  badgeText,
  badgeColor
}) {
  const iconColors = theme.colors.primary[iconColor];
  
  return (
    <Link href={href} className="group">
      <ThemedCard 
        className={`border-gray-700 hover:${iconColors.border} transition-all duration-300 hover:scale-105 h-full`}
        hover
      >
        <div className="p-8 text-center h-full flex flex-col justify-center">
          <div className={`${theme.components.icon.primary} ${iconColors.bg} ${theme.animations.iconHover}`}>
            {icon}
          </div>
          <h3 className={`${theme.typography.cardTitle} group-hover:${iconColors.text}`}>
            {title}
          </h3>
          <p className={theme.typography.cardDescription}>
            {description}
          </p>
          {badge && (
            <ThemedBadge 
              color={badgeColor || iconColor} 
              className="mt-4"
            >
              {badgeText || badge}
            </ThemedBadge>
          )}
        </div>
      </ThemedCard>
    </Link>
  );
}