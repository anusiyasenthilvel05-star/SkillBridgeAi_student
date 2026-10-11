import { createFileRoute } from '@tanstack/react-router';
import { DashboardView } from '@/components/learner';
import { pageHead } from '@/lib/learning';
export const Route = createFileRoute('/_authenticated/dashboard')({ head: () => ({ meta: [...pageHead('Dashboard', 'Your private SkillBridge AI Dashboard workspace.').meta, { name: 'robots', content: 'noindex' }] }), component: DashboardView });
