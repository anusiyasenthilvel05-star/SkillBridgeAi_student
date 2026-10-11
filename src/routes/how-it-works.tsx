import { createFileRoute } from '@tanstack/react-router';
import { ContentPage } from '@/components/site';
import { pageHead } from '@/lib/learning';
export const Route = createFileRoute('/how-it-works')({ head: () => pageHead('How It Works', 'See how SkillBridge AI turns your documents into notes, quizzes, insights and next steps.'), component: HowItWorksPage });
function HowItWorksPage() { return <ContentPage kind="how-it-works" />; }
