import { createFileRoute } from '@tanstack/react-router';
import { TutorView } from '@/components/learner';
import { pageHead } from '@/lib/learning';
export const Route = createFileRoute('/_authenticated/tutor')({ head: () => ({ meta: [...pageHead('Ask Your Materials', 'Your private SkillBridge AI Ask Your Materials workspace.').meta, { name: 'robots', content: 'noindex' }] }), component: TutorView });
