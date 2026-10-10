import { createFileRoute } from '@tanstack/react-router';
import { HomePage } from '@/components/site';
import { pageHead } from '@/lib/learning';
export const Route = createFileRoute('/')({ head: () => pageHead('Personalized Learning & Competency Insights', 'Turn your PDF and text learning materials into study notes, source-grounded quizzes, competency insights, and personalized learning plans with SkillBridge AI.'), component: HomePage });
