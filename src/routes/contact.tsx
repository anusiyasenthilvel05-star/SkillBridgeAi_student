import { createFileRoute } from '@tanstack/react-router';
import { ContentPage } from '@/components/site';
import { pageHead } from '@/lib/learning';
export const Route = createFileRoute('/contact')({ head: () => pageHead('Contact', 'Contact the SkillBridge AI team with questions or feedback.'), component: ContactPage });
function ContactPage() { return <ContentPage kind="contact" />; }
