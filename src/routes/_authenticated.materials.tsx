import { createFileRoute } from '@tanstack/react-router';
import { MaterialsView } from '@/components/learner';
import { pageHead } from '@/lib/learning';
export const Route = createFileRoute('/_authenticated/materials')({ head: () => ({ meta: [...pageHead('My Materials', 'Your private SkillBridge AI My Materials workspace.').meta, { name: 'robots', content: 'noindex' }] }), component: MaterialsView });
