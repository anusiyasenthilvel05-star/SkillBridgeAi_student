import { createFileRoute } from '@tanstack/react-router';
import { LearnerLayout } from '@/components/learner';
export const Route = createFileRoute('/_authenticated')({ ssr: false, component: LearnerLayout });
