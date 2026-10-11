import { createFileRoute } from '@tanstack/react-router';
import { AuthPage } from '@/components/auth-page';
import { pageHead } from '@/lib/learning';
export const Route = createFileRoute('/forgot-password')({ head: () => pageHead('Forgot Password', 'Reset your SkillBridge AI password.'), component: ForgotPasswordPage });
function ForgotPasswordPage() { return <AuthPage mode="forgot" />; }
