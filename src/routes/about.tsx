import { createFileRoute } from '@tanstack/react-router';
import { ContentPage } from '@/components/site';
import { pageHead } from '@/lib/learning';
export const Route = createFileRoute('/about')({ head: () => pageHead('About', 'Learn about SkillBridge AI, an independent learning platform focused on competency insights.'), component: AboutPage });
function AboutPage() { return <ContentPage kind="about" />; }
