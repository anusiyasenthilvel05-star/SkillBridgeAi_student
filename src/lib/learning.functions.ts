import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { topicStats, type Attempt, type LearningData, type Question } from './learning';

export const getLearningData = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = context.supabase;
  const results = await Promise.all([
    db.from('documents').select('*').order('created_at', { ascending: false }),
    db.from('quizzes').select('id,document_id,title,difficulty,total_questions,created_at').order('created_at', { ascending: false }),
    db.from('quiz_attempts').select('*').order('completed_at', { ascending: false }),
    db.from('learning_tasks').select('*').order('created_at', { ascending: false }),
    db.from('profiles').select('full_name,organization').eq('id', context.userId).maybeSingle(),
  ]);
  for (const r of results) if (r.error) throw new Error('Unable to load your learning records. Please try again.');
  return { documents: results[0].data ?? [], quizzes: results[1].data ?? [], attempts: results[2].data ?? [], tasks: results[3].data ?? [], profile: results[4].data ?? { full_name: String(context.claims.user_metadata?.['full_name'] ?? ''), organization: '' }, email: String(context.claims.email ?? '') } as unknown as LearningData;
});

export const uploadMaterial = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string; base64: string }) => z.object({ name: z.string().min(1).max(200), base64: z.string().max(14_000_000) }).parse(data))
  .handler(async ({ data, context }) => {
    const { processDocument } = await import('./learning.server');
    const result = await processDocument(data.name, data.base64);
    const { data: existing } = await context.supabase.from('documents').select('id').eq('content_hash', result.hash).maybeSingle();
    if (existing) throw new Error('This material is already in your library. Open the existing document instead.');
    const id = crypto.randomUUID(); const path = `${context.userId}/${id}.${result.type}`;
    const { error: uploadError } = await context.supabase.storage.from('learning-materials').upload(path, result.bytes, { contentType: result.type === 'pdf' ? 'application/pdf' : 'text/plain', upsert: false });
    if (uploadError) throw new Error('File upload failed. Please try again.');
    const { data: doc, error } = await context.supabase.from('documents').insert({ id, user_id: context.userId, title: data.name.replace(/\.[^.]+$/, ''), storage_path: path, file_type: result.type, file_size: result.bytes.length, content_hash: result.hash, processing_status: 'ready', extracted_text: result.text, pages: result.pages }).select('id').single();
    if (error) { await context.supabase.storage.from('learning-materials').remove([path]); throw new Error(error.code === '23505' ? 'This material is already in your library.' : 'Unable to save this material. Please try again.'); }
    return doc;
  });

export const editMaterial = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; action: 'rename' | 'delete'; title?: string }) => z.object({ id: z.string().uuid(), action: z.enum(['rename', 'delete']), title: z.string().trim().min(1).max(200).optional() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: doc, error } = await context.supabase.from('documents').select('storage_path').eq('id', data.id).single();
    if (error || !doc) throw new Error('Material unavailable.');
    if (data.action === 'delete') {
      const { error: storageError } = await context.supabase.storage.from('learning-materials').remove([doc.storage_path]);
      if (storageError) throw new Error('Unable to delete the file. Please retry.');
      const { error: deleteError } = await context.supabase.from('documents').delete().eq('id', data.id);
      if (deleteError) throw new Error('Unable to delete material.');
    } else {
      if (!data.title) throw new Error('Enter a title.');
      const { error: updateError } = await context.supabase.from('documents').update({ title: data.title }).eq('id', data.id);
      if (updateError) throw new Error('Unable to rename material.');
    }
    return { success: true };
  });

export const generateGuide = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { documentId: string; style: string }) => z.object({ documentId: z.string().uuid(), style: z.enum(['Short', 'Detailed', 'Beginner-friendly']) }).parse(data))
  .handler(async ({ data, context }) => {
    const db = context.supabase; const kind = `guide:${data.style}`;
    const { data: doc } = await db.from('documents').select('*').eq('id', data.documentId).single();
    if (!doc || doc.processing_status !== 'ready') throw new Error('Select a processed material.');
    const { data: existing } = await db.from('study_guides').select('content').eq('document_id', doc.id).eq('guide_type', kind).maybeSingle();
    if (existing) return existing.content;
    const { createGuide } = await import('./learning.server');
    const content = await createGuide(doc.extracted_text, data.style);
    const { error } = await db.from('study_guides').upsert({ user_id: context.userId, document_id: doc.id, guide_type: kind, content }, { onConflict: 'document_id,guide_type' });
    if (error) throw new Error('Unable to save your study guide.');
    return content;
  });

export const generateQuiz = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { documentId: string; count: number; difficulty: string; title: string; topic: string }) => z.object({ documentId: z.string().uuid(), count: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20)]), difficulty: z.enum(['Easy', 'Medium', 'Hard']), title: z.string().trim().min(1).max(120), topic: z.string().max(120) }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: doc } = await context.supabase.from('documents').select('*').eq('id', data.documentId).single();
    if (!doc || doc.processing_status !== 'ready') throw new Error('Select a processed document.');
    const { createQuestions } = await import('./learning.server');
    const questions = await createQuestions(doc.extracted_text, data.count, data.difficulty, data.topic);
    const { data: quiz, error } = await context.supabase.from('quizzes').insert({ user_id: context.userId, document_id: doc.id, title: data.title, difficulty: data.difficulty, total_questions: questions.length, questions }).select('id').single();
    if (error) throw new Error('Unable to save this quiz. Please retry.');
    return quiz;
  });

export const loadQuiz = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data)).handler(async ({ data, context }) => {
  const { data: quiz, error } = await context.supabase.rpc('quiz_for_learning', { p_quiz: data.id });
  if (error) throw new Error('Quiz unavailable.');
  return quiz as unknown as { id: string; title: string; questions: Question[] };
});
export const submitQuiz = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((data: { id: string; answers: number[]; submissionId: string }) => z.object({ id: z.string().uuid(), answers: z.array(z.number().int().min(-1).max(3)).max(20), submissionId: z.string().uuid() }).parse(data)).handler(async ({ data, context }) => {
  const { data: attempt, error } = await context.supabase.rpc('submit_learning_quiz', { p_quiz: data.id, p_answers: data.answers, p_submission: data.submissionId });
  if (error) throw new Error('Unable to submit this quiz. Your answers are preserved; please retry.');
  return attempt as unknown as Attempt;
});

export const regeneratePlan = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from('quiz_attempts').select('*');
  if (error) throw new Error('Unable to analyze assessments.');
  const stats = topicStats((data ?? []) as unknown as Attempt[]);
  if (!stats.length) throw new Error('Complete a quiz to receive a personalized plan.');
  const tasks = stats.map(s => ({ user_id: context.userId, document_id: s.document_id, topic: s.topic, title: s.attempted < 5 ? `Practice ${s.topic}` : s.accuracy < 50 ? `Review ${s.topic}` : s.accuracy < 70 ? `Strengthen ${s.topic}` : `Revisit ${s.topic}`, reason: `${s.correct} of ${s.attempted} answers correct (${s.accuracy}%). ${s.attempted < 5 ? 'More evidence is needed; take a targeted assessment.' : s.accuracy < 70 ? 'Review the source concepts, then complete targeted practice.' : 'Take a mixed quiz to check retention.'}`, priority: s.attempted >= 5 && s.accuracy < 50 ? 'High' : s.accuracy < 70 ? 'Medium' : 'Low', estimated_minutes: s.accuracy < 50 ? 20 : 15 }));
  const { error: saveError } = await context.supabase.from('learning_tasks').upsert(tasks, { onConflict: 'user_id,document_id,topic' });
  if (saveError) throw new Error('Unable to update your learning plan.');
  return { success: true };
});
export const updateTask = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((data: { id: string; status: string }) => z.object({ id: z.string().uuid(), status: z.enum(['Not Started', 'In Progress', 'Completed']) }).parse(data)).handler(async ({ data, context }) => {
  const { error } = await context.supabase.from('learning_tasks').update({ status: data.status }).eq('id', data.id);
  if (error) throw new Error('Unable to update this task.'); return { success: true };
});
export const tutorMessages = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((data: { documentId: string }) => z.object({ documentId: z.string().uuid() }).parse(data)).handler(async ({ data, context }) => {
  const { data: messages, error } = await context.supabase.from('tutor_messages').select('id,role,content,created_at').eq('document_id', data.documentId).order('created_at');
  if (error) throw new Error('Unable to load conversation.'); return messages;
});
export const askTutor = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((data: { documentId: string; question: string }) => z.object({ documentId: z.string().uuid(), question: z.string().trim().min(1).max(2000) }).parse(data)).handler(async ({ data, context }) => {
  const { data: doc } = await context.supabase.from('documents').select('extracted_text').eq('id', data.documentId).single();
  if (!doc) throw new Error('Material unavailable.');
  const { answerFromDocument } = await import('./learning.server');
  const answer = await answerFromDocument(doc.extracted_text, data.question);
  const { error } = await context.supabase.from('tutor_messages').insert([{ user_id: context.userId, document_id: data.documentId, role: 'user', content: data.question }, { user_id: context.userId, document_id: data.documentId, role: 'assistant', content: answer }]);
  if (error) throw new Error('Unable to save conversation.'); return answer;
});
export const saveProfile = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((data: { full_name: string; organization: string }) => z.object({ full_name: z.string().trim().min(1).max(100), organization: z.string().trim().max(200) }).parse(data)).handler(async ({ data, context }) => {
  const { error } = await context.supabase.from('profiles').upsert({ id: context.userId, ...data }); if (error) throw new Error('Unable to save profile.'); return { success: true };
});