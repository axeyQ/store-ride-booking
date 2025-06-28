import { DailyOpsComprehensiveFix } from '@/components/DailyOpsRevenueFix';
import { ThemedLayout } from '@/components/themed';

export default function AdminToolsPage() {
  return (
    <ThemedLayout title="🔧 Admin Tools">
      <div className="container mx-auto px-6 py-8">
        <DailyOpsComprehensiveFix />
      </div>
    </ThemedLayout>
  );
}