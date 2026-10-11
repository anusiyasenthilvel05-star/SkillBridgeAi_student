import { createFileRoute } from '@tanstack/react-router';
import { ContentPage } from '@/components/site';
import { pageHead } from '@/lib/learning';
export const Route = createFileRoute('/privacy')({ head: () => pageHead('Privacy Policy', 'How SkillBridge AI protects your learning materials and progress data.'), component: PrivacyPage });
function PrivacyPage() { return <ContentPage kind="privacy" />; }
