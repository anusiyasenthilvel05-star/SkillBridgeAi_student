import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { StudyView } from '@/components/learner';
import { pageHead } from '@/lib/learning';
export const Route = createFileRoute('/_authenticated/study')({ validateSearch: z.object({ doc: z.string().optional() }), head: () => ({ meta: [...pageHead('Study Assistant', 'Generate summaries, notes and flashcards from your materials.').meta, { name: 'robots', content: 'noindex' }] }), component: StudyPage });
function StudyPage() { const { doc } = Route.useSearch(); return <StudyView initialDoc={doc} />; }
