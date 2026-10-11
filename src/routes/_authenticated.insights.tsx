import { createFileRoute } from '@tanstack/react-router';
import { InsightsView } from '@/components/learner';
import { pageHead } from '@/lib/learning';
export const Route = createFileRoute('/_authenticated/insights')({ head: () => ({ meta: [...pageHead('Competency Insights', 'Your private SkillBridge AI Competency Insights workspace.').meta, { name: 'robots', content: 'noindex' }] }), component: InsightsView });
