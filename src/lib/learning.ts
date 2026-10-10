export type Material = { id: string; title: string; file_type: string; file_size: number; processing_status: string; extracted_text: string; created_at: string; storage_path: string };
export type Question = { question: string; options: string[]; topic: string; correct?: number; explanation?: string; source?: string; selected?: number; is_correct?: boolean; document_id?: string };
export type Attempt = { id: string; quiz_id: string; score: number; total_questions: number; percentage: number; completed_at: string; answers: Question[] };
export type Quiz = { id: string; document_id: string; title: string; difficulty: string; total_questions: number; created_at: string };
export type Task = { id: string; document_id: string; topic: string; title: string; reason: string; priority: string; estimated_minutes: number; status: string };
export type Guide = { summary: string; notes: string[]; concepts: { term: string; explanation: string; source: string }[]; flashcards: { question: string; answer: string }[] };
export type LearningData = { documents: Material[]; quizzes: Quiz[]; attempts: Attempt[]; tasks: Task[]; profile: { full_name: string; organization: string }; email: string };
export function topicStats(attempts: Attempt[]) {
  const map = new Map<string, { topic: string; attempted: number; correct: number; document_id: string; latest: string }>();
  for (const a of attempts) for (const q of a.answers) {
    const key = `${q.document_id}:${q.topic.trim().toLowerCase()}`;
    const row = map.get(key) ?? { topic: q.topic, attempted: 0, correct: 0, document_id: q.document_id ?? '', latest: a.completed_at };
    row.attempted++; if (q.is_correct) row.correct++;
    if (a.completed_at > row.latest) row.latest = a.completed_at;
    map.set(key, row);
  }
  return [...map.values()].map(r => ({ ...r, accuracy: Math.round(r.correct / r.attempted * 100), status: r.attempted < 5 ? 'Not Enough Data' : r.correct / r.attempted < .5 ? 'Needs Review' : r.correct / r.attempted < .7 ? 'Developing' : 'Good Progress' }));
}
export function pageHead(title: string, description: string) {
  return { meta: [{ title: `${title} — SkillBridge AI` }, { name: 'description', content: description }, { property: 'og:title', content: `${title} — SkillBridge AI` }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] };
}