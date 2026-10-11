import { createFileRoute } from '@tanstack/react-router';
import { QuizzesView } from '@/components/learner';
import { pageHead } from '@/lib/learning';
export const Route = createFileRoute('/_authenticated/quizzes')({ head: () => ({ meta: [...pageHead('Quizzes', 'Your private SkillBridge AI Quizzes workspace.').meta, { name: 'robots', content: 'noindex' }] }), component: QuizzesView });
