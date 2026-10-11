import { createFileRoute } from '@tanstack/react-router';
import { AuthPage } from '@/components/auth-page';
import { pageHead } from '@/lib/learning';
export const Route = createFileRoute('/auth')({ head: () => pageHead('Log In', 'Log in to continue your personalized learning journey.'), component: AuthPage });
function AuthPage() { return <AuthPage mode="login" />; }
