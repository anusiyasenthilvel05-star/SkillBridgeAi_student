import { createFileRoute } from '@tanstack/react-router';
import { ProfileView } from '@/components/learner';
import { pageHead } from '@/lib/learning';
export const Route = createFileRoute('/_authenticated/profile')({ head: () => ({ meta: [...pageHead('Profile', 'Your private SkillBridge AI Profile workspace.').meta, { name: 'robots', content: 'noindex' }] }), component: ProfileView });
