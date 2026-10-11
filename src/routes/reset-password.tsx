import { createFileRoute } from '@tanstack/react-router';
import { AuthPage } from '@/components/auth-page';
import { pageHead } from '@/lib/learning';
export const Route = createFileRoute('/reset-password')({ head: () => pageHead('Set New Password', 'Choose a new password for your account.'), component: ResetPasswordPage });
function ResetPasswordPage() { return <AuthPage mode="reset" />; }
