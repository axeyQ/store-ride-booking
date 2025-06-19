import { ThemedCard } from './ThemedCard';
import { theme } from '@/lib/theme';

export function ThemedStatsCard({ 
  title, 
  value, 
  subtitle,
  colorScheme = 'revenue',
  progress,
  trend,
  icon
}) {
  const colors = theme.colors.stats[colorScheme] || theme.colors.stats.revenue;
  
  return (
    <ThemedCard 
      className={`${colors.bg} ${colors.border} hover:scale-105 transition-transform`}
      hover
    >
      <div className="text-center">
        {icon && (
          <div className="mb-4">
            {icon}
          </div>
        )}
        <div className={`text-3xl font-bold ${colors.text} mb-2`}>
          {value}
        </div>
        <div className={`${colors.light} text-sm`}>
          {title}
        </div>
        {subtitle && (
          <div className={`text-xs ${colors.light} mt-1 opacity-80`}>
            {subtitle}
          </div>
        )}
        {progress && (
          <div className={`w-full ${colors.bg} rounded-full h-2 mt-3`}>
            <div 
              className={`${colors.text.replace('text-', 'bg-')} h-2 rounded-full`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </div>
    </ThemedCard>
  );
}