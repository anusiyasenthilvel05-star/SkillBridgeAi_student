import { createFileRoute } from '@tanstack/react-router';
import { ContentPage } from '@/components/site';
import { pageHead } from '@/lib/learning';
export const Route = createFileRoute('/terms')({ head: () => pageHead('Terms of Use', 'Terms governing use of the SkillBridge AI learning platform.'), component: TermsPage });
function TermsPage() { return <ContentPage kind="terms" />; }
