import { createFileRoute } from '@tanstack/react-router';
import { AuthPage } from '@/components/auth-page';
import { pageHead } from '@/lib/learning';
export const Route = createFileRoute('/register')({ head: () => pageHead('Create Account', 'Create a free SkillBridge AI account.'), component: RegisterPage });
function RegisterPage() { return <AuthPage mode="register" />; }
