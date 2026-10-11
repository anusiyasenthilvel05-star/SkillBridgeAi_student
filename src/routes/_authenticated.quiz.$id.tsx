import { createFileRoute } from '@tanstack/react-router';
import { QuizTake } from '@/components/learner';
import { pageHead } from '@/lib/learning';
export const Route = createFileRoute('/_authenticated/quiz/$id')({ head: () => ({ meta: [...pageHead('Take Quiz', 'Answer source-based questions from your material.').meta, { name: 'robots', content: 'noindex' }] }), component: QuizPage });
function QuizPage() { const { id } = Route.useParams(); return <QuizTake key={id} id={id} />; }
