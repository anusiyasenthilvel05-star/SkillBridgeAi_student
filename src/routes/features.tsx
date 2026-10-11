import { createFileRoute } from '@tanstack/react-router';
import { ContentPage } from '@/components/site';
import { pageHead } from '@/lib/learning';
export const Route = createFileRoute('/features')({ head: () => pageHead('Features', 'Explore AI study guides, source-based quizzes, competency gap analysis and personalized learning plans.'), component: FeaturesPage });
function FeaturesPage() { return <ContentPage kind="features" />; }
