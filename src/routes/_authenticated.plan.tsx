import { createFileRoute } from '@tanstack/react-router';
import { PlanView } from '@/components/learner';
import { pageHead } from '@/lib/learning';
export const Route = createFileRoute('/_authenticated/plan')({ head: () => ({ meta: [...pageHead('Learning Plan', 'Your private SkillBridge AI Learning Plan workspace.').meta, { name: 'robots', content: 'noindex' }] }), component: PlanView });
