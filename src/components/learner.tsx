import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient, queryOptions } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BookOpen, ChartNoAxesCombined, ClipboardList, FileText, LayoutDashboard, ListChecks, LoaderCircle, LogOut, MessageSquare, Pencil, Sparkles, Trash2, Upload, User } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { Brand } from './site';
import { RichText } from './rich-text';
import { askTutor, editMaterial, generateGuide, generateQuiz, getLearningData, loadQuiz, regeneratePlan, saveProfile, submitQuiz, tutorMessages, updateTask, uploadMaterial } from '@/lib/learning.functions';
import { topicStats, type Attempt, type Guide, type LearningData, type Question } from '@/lib/learning';

const msg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.');
function useLearning() {
  const fn = useServerFn(getLearningData);
  return useQuery(queryOptions({ queryKey: ['learning'], queryFn: () => fn() as Promise<LearningData> }));
}
function useRefresh() { const qc = useQueryClient(); return () => qc.invalidateQueries({ queryKey: ['learning'] }); }

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/materials', label: 'My Materials', icon: FileText },
  { to: '/study', label: 'Study Assistant', icon: BookOpen },
  { to: '/quizzes', label: 'Quizzes', icon: ClipboardList },
  { to: '/insights', label: 'Competency Insights', icon: ChartNoAxesCombined },
  { to: '/plan', label: 'Learning Plan', icon: ListChecks },
  { to: '/tutor', label: 'Ask Your Materials', icon: MessageSquare },
  { to: '/profile', label: 'Profile', icon: User },
] as const;

export function LearnerLayout() {
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'in' | 'out'>('loading');
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState(data.session ? 'in' : 'out'));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setState(s ? 'in' : 'out'));
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => { if (state === 'out') navigate({ to: '/auth' }); }, [state, navigate]);
  if (state !== 'in') return <div className="min-h-screen grid place-items-center"><LoaderCircle className="animate-spin text-teal" /></div>;
  return <div className="portal">
    <aside className="portal-sidebar"><Brand />
      <nav className="sidebar-nav">{nav.map(n => <Link key={n.to} to={n.to} className="sidebar-link" activeProps={{ className: 'active' }}><n.icon size={17} /><span>{n.label}</span></Link>)}</nav>
      <button className="sidebar-link mt-auto" onClick={async () => { await supabase.auth.signOut(); navigate({ to: '/' }); }}><LogOut size={17} /><span>Log out</span></button>
    </aside>
    <div className="portal-main">
      <div className="portal-topbar md:hidden"><div className="flex gap-3 overflow-x-auto">{nav.map(n => <Link key={n.to} to={n.to} className="text-xs whitespace-nowrap" activeProps={{ className: 'text-teal font-semibold' }}>{n.label}</Link>)}</div></div>
      <main className="portal-content"><Outlet /></main>
    </div>
  </div>;
}

function Heading({ title, sub, action }: { title: string; sub: string; action?: ReactNode }) { return <div className="page-heading"><div><h1>{title}</h1><p>{sub}</p></div>{action}</div>; }
function Empty({ icon: Icon, title, text, action }: { icon: typeof FileText; title: string; text: string; action?: ReactNode }) { return <div className="empty-state"><div className="empty-icon"><Icon size={22} /></div><h3>{title}</h3><p>{text}</p>{action}</div>; }
function Loading({ data, error, children }: { data: unknown; error: unknown; children: () => ReactNode }) {
  if (error) return <div className="error-note">{msg(error)}</div>;
  if (!data) return <div className="py-20 grid place-items-center"><LoaderCircle className="animate-spin text-teal" /></div>;
  return <>{children()}</>;
}
function DocSelect({ data, value, onChange }: { data: LearningData; value: string; onChange: (v: string) => void }) {
  return <select className="field" value={value} onChange={e => onChange(e.target.value)}><option value="">Select a material</option>{data.documents.filter(d => d.processing_status === 'ready').map(d => <option key={d.id} value={d.id}>{d.title}</option>)}</select>;
}
const uploadCta = <Button asChild variant="teal"><Link to="/materials"><Upload /> Upload material</Link></Button>;

export function DashboardView() {
  const q = useLearning();
  return <Loading data={q.data} error={q.error}>{() => {
    const d = q.data!; const stats = topicStats(d.attempts); const avg = d.attempts.length ? Math.round(d.attempts.reduce((s, a) => s + Number(a.percentage), 0) / d.attempts.length) : null;
    const weak = stats.filter(s => s.status === 'Needs Review' || s.status === 'Developing').sort((a, b) => a.accuracy - b.accuracy).slice(0, 4);
    return <>
      <Heading title={`Welcome${d.profile.full_name ? `, ${d.profile.full_name.split(' ')[0]}` : ''}.`} sub="Here’s where your learning stands today." action={uploadCta} />
      <div className="stats-grid">{[['Materials', d.documents.length], ['Quizzes taken', d.attempts.length], ['Average score', avg === null ? '—' : `${avg}%`], ['Open tasks', d.tasks.filter(t => t.status !== 'Completed').length]].map(([l, v]) => <div className="stat-card" key={l}><div className="text-xs text-muted-foreground">{l}</div><div className="value">{v}</div></div>)}</div>
      {!d.documents.length ? <div className="mt-8"><Empty icon={Upload} title="Start with your first material" text="Upload a PDF or TXT document to generate study notes, quizzes and insights from your own content." action={uploadCta} /></div> : <>
        <div className="section-line"><h2>Topics needing attention</h2><Link to="/insights" className="text-xs text-teal">View insights</Link></div>
        {weak.length ? weak.map(s => <TopicRow key={s.document_id + s.topic} s={s} />) : <p className="text-sm text-muted-foreground">{d.attempts.length ? 'No weak topics detected yet. Keep practicing to confirm retention.' : 'Take a quiz to discover topic-level strengths and gaps.'}</p>}
        <div className="section-line"><h2>Recent quiz results</h2><Link to="/quizzes" className="text-xs text-teal">All quizzes</Link></div>
        {d.attempts.length ? d.attempts.slice(0, 5).map(a => <AttemptRow key={a.id} a={a} d={d} />) : <p className="text-sm text-muted-foreground">No quizzes completed yet.</p>}
      </>}
    </>;
  }}</Loading>;
}
function AttemptRow({ a, d }: { a: Attempt; d: LearningData }) {
  return <div className="document-row"><div className="document-icon"><ClipboardList size={18} /></div><div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{d.quizzes.find(x => x.id === a.quiz_id)?.title ?? 'Quiz'}</div><div className="text-xs text-muted-foreground">{new Date(a.completed_at).toLocaleString()}</div></div><div className="font-bold">{a.score}/{a.total_questions} <span className="text-xs text-muted-foreground">({Math.round(Number(a.percentage))}%)</span></div></div>;
}
function TopicRow({ s }: { s: ReturnType<typeof topicStats>[number] }) {
  return <div className="topic-row"><div className="flex justify-between gap-3"><div><div className="font-semibold text-sm">{s.topic}</div><div className="text-xs text-muted-foreground">{s.correct} of {s.attempted} correct</div></div><div className="text-right"><span className={`status-pill ${s.status === 'Needs Review' ? 'review' : ''}`}>{s.status}</span><div className="font-bold mt-1">{s.accuracy}%</div></div></div><div className="progress-track"><div className="progress-fill" style={{ width: `${s.accuracy}%` }} /></div></div>;
}

export function MaterialsView() {
  const q = useLearning(); const refresh = useRefresh();
  const up = useServerFn(uploadMaterial); const edit = useServerFn(editMaterial);
  const [busy, setBusy] = useState(false); const input = useRef<HTMLInputElement>(null);
  async function onFile(file?: File) {
    if (!file) return; if (file.size > 10 * 1024 * 1024) { toast.error('Choose a file smaller than 10 MB.'); return; }
    setBusy(true);
    try {
      const buf = new Uint8Array(await file.arrayBuffer()); let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      await up({ data: { name: file.name, base64: btoa(bin) } }); toast.success('Material processed and added to your library.'); await refresh();
    } catch (e) { toast.error(msg(e)); } finally { setBusy(false); if (input.current) input.current.value = ''; }
  }
  return <Loading data={q.data} error={q.error}>{() => <>
    <Heading title="My Materials" sub="Your private library of learning documents. PDF and TXT, up to 10 MB." />
    <div className="upload-zone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}>
      <Upload className="mx-auto text-teal mb-3" /><h2 className="font-semibold mb-1">Drop a file here or browse</h2><p className="text-xs text-muted-foreground mb-4">Text-based PDFs and UTF-8 TXT files. Duplicates are detected automatically.</p>
      <input ref={input} type="file" accept=".pdf,.txt" hidden onChange={e => onFile(e.target.files?.[0])} />
      <Button variant="teal" disabled={busy} onClick={() => input.current?.click()}>{busy ? <><LoaderCircle className="animate-spin" /> Processing…</> : 'Choose file'}</Button>
    </div>
    {!q.data!.documents.length ? <Empty icon={FileText} title="Your library is empty" text="Upload your first learning document to get started." /> : q.data!.documents.map(doc => <div className="document-row" key={doc.id}>
      <div className="document-icon"><FileText size={18} /></div>
      <div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{doc.title}</div><div className="text-xs text-muted-foreground">{doc.file_type.toUpperCase()} · {(doc.file_size / 1024).toFixed(0)} KB · {new Date(doc.created_at).toLocaleDateString()}</div></div>
      <Button size="sm" variant="outline" asChild><Link to="/study" search={{ doc: doc.id }}>Study</Link></Button>
      <Button size="icon" variant="ghost" aria-label="Rename" onClick={async () => { const t = prompt('New title', doc.title); if (!t) return; try { await edit({ data: { id: doc.id, action: 'rename', title: t } }); refresh(); } catch (e) { toast.error(msg(e)); } }}><Pencil /></Button>
      <Button size="icon" variant="ghost" aria-label="Delete" onClick={async () => { if (!confirm(`Delete “${doc.title}” and all its guides, quizzes and history?`)) return; try { await edit({ data: { id: doc.id, action: 'delete' } }); toast.success('Material deleted.'); refresh(); } catch (e) { toast.error(msg(e)); } }}><Trash2 /></Button>
    </div>)}
  </>}</Loading>;
}

export function StudyView({ initialDoc }: { initialDoc?: string | undefined }) {
  const q = useLearning(); const gen = useServerFn(generateGuide);
  const [doc, setDoc] = useState(initialDoc ?? ''); const [style, setStyle] = useState('Detailed'); const [guide, setGuide] = useState<Guide | null>(null);
  const [busy, setBusy] = useState(false); const [tab, setTab] = useState('Summary'); const [card, setCard] = useState(0); const [flip, setFlip] = useState(false);
  async function run() { if (!doc) { toast.error('Select a material first.'); return; } setBusy(true); setGuide(null); try { setGuide(await gen({ data: { documentId: doc, style } }) as Guide); setCard(0); setFlip(false); } catch (e) { toast.error(msg(e)); } finally { setBusy(false); } }
  return <Loading data={q.data} error={q.error}>{() => <>
    <Heading title="Study Assistant" sub="Summaries, notes, key concepts and flashcards generated only from your material." />
    {!q.data!.documents.length ? <Empty icon={BookOpen} title="No materials yet" text="Upload a document to start studying." action={uploadCta} /> : <>
      <div className="toolbar"><DocSelect data={q.data!} value={doc} onChange={v => { setDoc(v); setGuide(null); }} /><select className="field" value={style} onChange={e => setStyle(e.target.value)}>{['Short', 'Detailed', 'Beginner-friendly'].map(s => <option key={s}>{s}</option>)}</select><Button variant="teal" onClick={run} disabled={busy}>{busy ? <><LoaderCircle className="animate-spin" /> Generating…</> : <><Sparkles /> Generate guide</>}</Button></div>
      {guide && <><div className="study-tabs">{['Summary', 'Notes', 'Key Concepts', 'Flashcards'].map(t => <button key={t} className={tab === t ? 'selected' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
        {tab === 'Summary' && <RichText className="prose-content" text={guide.summary} />}
        {tab === 'Notes' && <ul className="list-disc pl-5 space-y-3 text-sm leading-7">{guide.notes.map((n, i) => <li key={i}><RichText inline text={n} /></li>)}</ul>}
        {tab === 'Key Concepts' && guide.concepts.map((c, i) => <div className="concept-row" key={i}><div className="font-semibold text-sm"><RichText inline text={c.term} /></div><RichText className="text-sm text-muted-foreground mt-1" text={c.explanation} />{c.source && <div className="text-[11px] text-teal mt-1">{c.source}</div>}</div>)}
        {tab === 'Flashcards' && guide.flashcards.length > 0 && <div className="max-w-xl"><button className="flashcard w-full" onClick={() => setFlip(!flip)}><div><div className="text-[11px] text-muted-foreground mb-3">{flip ? 'Answer' : 'Question'} · {card + 1}/{guide.flashcards.length}</div><div className="text-base font-semibold leading-7"><RichText text={flip ? guide.flashcards[card]!.answer : guide.flashcards[card]!.question} /></div></div></button><div className="flex justify-between mt-4"><Button variant="outline" disabled={card === 0} onClick={() => { setCard(card - 1); setFlip(false); }}>Previous</Button><Button variant="outline" disabled={card === guide.flashcards.length - 1} onClick={() => { setCard(card + 1); setFlip(false); }}>Next</Button></div></div>}
        <p className="text-[11px] text-muted-foreground mt-8">AI-generated from your material. Always verify important details against the source.</p></>}
    </>}
  </>}</Loading>;
}

export function QuizzesView() {
  const q = useLearning(); const refresh = useRefresh(); const gen = useServerFn(generateQuiz); const navigate = useNavigate();
  const [f, setF] = useState({ documentId: '', count: 10, difficulty: 'Medium', title: '', topic: '' }); const [busy, setBusy] = useState(false);
  async function create() {
    if (!f.documentId) { toast.error('Select a material.'); return; }
    setBusy(true);
    try { const doc = q.data!.documents.find(d => d.id === f.documentId)!; const quiz = await gen({ data: { ...f, count: f.count as 5, title: f.title.trim() || `${doc.title} — ${f.difficulty} quiz` } }); await refresh(); navigate({ to: '/quiz/$id', params: { id: quiz.id } }); }
    catch (e) { toast.error(msg(e)); } finally { setBusy(false); }
  }
  return <Loading data={q.data} error={q.error}>{() => { const d = q.data!; return <>
    <Heading title="Quizzes" sub="Generate source-based multiple-choice assessments and review your results." />
    {!d.documents.length ? <Empty icon={ClipboardList} title="No materials yet" text="Upload a document before creating a quiz." action={uploadCta} /> : <div className="stat-card mb-8">
      <h2 className="font-semibold mb-4">Create a new quiz</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div><label className="field-label">Material</label><DocSelect data={d} value={f.documentId} onChange={v => setF({ ...f, documentId: v })} /></div>
        <div><label className="field-label">Title (optional)</label><input className="field" maxLength={120} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></div>
        <div><label className="field-label">Focus topic (optional)</label><input className="field" maxLength={120} value={f.topic} onChange={e => setF({ ...f, topic: e.target.value })} placeholder="e.g. sampling methods" /></div>
        <div className="grid grid-cols-2 gap-4"><div><label className="field-label">Questions</label><select className="field" value={f.count} onChange={e => setF({ ...f, count: Number(e.target.value) })}>{[5, 10, 15, 20].map(n => <option key={n}>{n}</option>)}</select></div><div><label className="field-label">Difficulty</label><select className="field" value={f.difficulty} onChange={e => setF({ ...f, difficulty: e.target.value })}>{['Easy', 'Medium', 'Hard'].map(n => <option key={n}>{n}</option>)}</select></div></div>
      </div>
      <Button variant="teal" className="mt-5" disabled={busy} onClick={create}>{busy ? <><LoaderCircle className="animate-spin" /> Generating questions…</> : <><Sparkles /> Generate quiz</>}</Button>
    </div>}
    <div className="section-line"><h2>Your quizzes</h2></div>
    {!d.quizzes.length ? <p className="text-sm text-muted-foreground">No quizzes yet.</p> : d.quizzes.map(z => { const tries = d.attempts.filter(a => a.quiz_id === z.id); return <div className="document-row" key={z.id}><div className="document-icon"><ClipboardList size={18} /></div><div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{z.title}</div><div className="text-xs text-muted-foreground">{z.total_questions} questions · {z.difficulty} · {tries.length ? `Best ${Math.max(...tries.map(t => Math.round(Number(t.percentage))))}%` : 'Not attempted'}</div></div><Button size="sm" variant="outline" asChild><Link to="/quiz/$id" params={{ id: z.id }}>{tries.length ? 'Retake' : 'Start'}</Link></Button></div>; })}
  </>; }}</Loading>;
}

export function QuizTake({ id }: { id: string }) {
  const load = useServerFn(loadQuiz); const submit = useServerFn(submitQuiz); const refresh = useRefresh();
  const quiz = useQuery({ queryKey: ['quiz', id], queryFn: () => load({ data: { id } }), staleTime: Infinity });
  const [answers, setAnswers] = useState<number[]>([]); const [idx, setIdx] = useState(0); const [busy, setBusy] = useState(false); const [result, setResult] = useState<Attempt | null>(null);
  const submission = useMemo(() => crypto.randomUUID(), [id]);
  useEffect(() => { if (quiz.data) setAnswers(quiz.data.questions.map(() => -1)); }, [quiz.data]);
  async function send() {
    if (answers.includes(-1) && !confirm('Some questions are unanswered. Submit anyway?')) return;
    setBusy(true); try { setResult(await submit({ data: { id, answers, submissionId: submission } })); refresh(); } catch (e) { toast.error(msg(e)); } finally { setBusy(false); }
  }
  return <Loading data={quiz.data} error={quiz.error}>{() => { const z = quiz.data!; const qn: Question | undefined = z.questions[idx];
    if (result) return <><Heading title="Quiz results" sub={z.title} action={<Button variant="outline" asChild><Link to="/insights">View insights</Link></Button>} />
      <div className="stat-card mb-6"><div className="text-xs text-muted-foreground">Score</div><div className="value">{result.score}/{result.total_questions} · {Math.round(Number(result.percentage))}%</div></div>
      {result.answers.map((a, i) => <div className="concept-row" key={i}><div className="font-semibold text-sm">{i + 1}. <RichText inline text={a.question} /></div><div className={`text-sm mt-2 ${a.is_correct ? 'text-teal' : 'text-destructive'}`}>{a.is_correct ? 'Correct' : `Your answer: ${a.selected !== undefined && a.selected >= 0 ? '' : 'Not answered'}`}{a.selected !== undefined && a.selected >= 0 && !a.is_correct && <RichText inline text={a.options[a.selected]} />}</div>{!a.is_correct && a.correct !== undefined && <div className="text-sm mt-1">Correct answer: <RichText inline text={a.options[a.correct]} /></div>}{a.explanation && <RichText className="text-sm text-muted-foreground mt-2" text={a.explanation} />}<div className="text-[11px] text-muted-foreground mt-1">Topic: {a.topic}{a.source ? ` · ${a.source}` : ''}</div></div>)}
    </>;
    if (!qn) return null;
    return <><Heading title={z.title} sub={`Question ${idx + 1} of ${z.questions.length} · Topic: ${qn.topic}`} />
      <div className="progress-track mb-8"><div className="progress-fill" style={{ width: `${(answers.filter(a => a >= 0).length / z.questions.length) * 100}%` }} /></div>
      <h2 className="text-lg font-semibold mb-5 leading-8"><RichText inline text={qn.question} /></h2>
      <div className="space-y-3 max-w-3xl">{qn.options.map((o, i) => <Button key={i} variant="outline" className={`quiz-option ${answers[idx] === i ? 'chosen' : ''}`} onClick={() => setAnswers(answers.map((a, j) => (j === idx ? i : a)))}><span className="answer-index">{'ABCD'[i]}</span><RichText inline text={o} /></Button>)}</div>
      <div className="flex justify-between mt-8 max-w-3xl"><Button variant="outline" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>Previous</Button>{idx < z.questions.length - 1 ? <Button variant="teal" onClick={() => setIdx(idx + 1)}>Next</Button> : <Button variant="teal" disabled={busy} onClick={send}>{busy ? <LoaderCircle className="animate-spin" /> : 'Submit quiz'}</Button>}</div>
    </>; }}</Loading>;
}

export function InsightsView() {
  const q = useLearning();
  return <Loading data={q.data} error={q.error}>{() => { const d = q.data!; const stats = topicStats(d.attempts).sort((a, b) => a.accuracy - b.accuracy); return <>
    <Heading title="Competency Insights" sub="Topic-level accuracy calculated from every answer you’ve submitted. At least 5 answers per topic are needed for a reliable status." />
    {!stats.length ? <Empty icon={ChartNoAxesCombined} title="No assessment data yet" text="Complete a quiz to see which topics you’ve mastered and which need review." action={<Button asChild variant="teal"><Link to="/quizzes">Take a quiz</Link></Button>} /> : <>
      <div className="stats-grid mb-6">{(['Needs Review', 'Developing', 'Good Progress', 'Not Enough Data'] as const).map(s => <div className="stat-card" key={s}><div className="text-xs text-muted-foreground">{s}</div><div className="value">{stats.filter(x => x.status === s).length}</div></div>)}</div>
      {d.documents.filter(doc => stats.some(s => s.document_id === doc.id)).map(doc => <div key={doc.id}><div className="section-line"><h2>{doc.title}</h2></div>{stats.filter(s => s.document_id === doc.id).map(s => <TopicRow key={s.topic} s={s} />)}</div>)}
    </>}
  </>; }}</Loading>;
}

export function PlanView() {
  const q = useLearning(); const refresh = useRefresh(); const regen = useServerFn(regeneratePlan); const upd = useServerFn(updateTask); const [busy, setBusy] = useState(false);
  return <Loading data={q.data} error={q.error}>{() => { const d = q.data!; const order = { High: 0, Medium: 1, Low: 2 } as Record<string, number>; const tasks = [...d.tasks].sort((a, b) => (a.status === 'Completed' ? 1 : 0) - (b.status === 'Completed' ? 1 : 0) || order[a.priority]! - order[b.priority]!);
    const done = d.tasks.filter(t => t.status === 'Completed').length;
    return <>
      <Heading title="Learning Plan" sub="Personalized next steps based on your assessment results." action={<Button variant="teal" disabled={busy} onClick={async () => { setBusy(true); try { await regen(); toast.success('Learning plan updated.'); refresh(); } catch (e) { toast.error(msg(e)); } finally { setBusy(false); } }}>{busy ? <LoaderCircle className="animate-spin" /> : <Sparkles />} Update plan</Button>} />
      {!tasks.length ? <Empty icon={ListChecks} title="No plan yet" text="Complete a quiz, then select “Update plan” to receive personalized tasks." /> : <>
        <div className="text-sm mb-2">{done} of {tasks.length} tasks completed</div><div className="progress-track mb-6"><div className="progress-fill" style={{ width: `${(done / tasks.length) * 100}%` }} /></div>
        {tasks.map(t => <div className="task-row" key={t.id}><div className="flex justify-between gap-4 flex-wrap"><div className="max-w-2xl"><div className="flex gap-2 items-center mb-1"><span className={`status-pill ${t.priority === 'High' ? 'review' : ''}`}>{t.priority}</span><span className="text-[11px] text-muted-foreground">{t.estimated_minutes} min · {d.documents.find(x => x.id === t.document_id)?.title}</span></div><div className={`font-semibold text-sm ${t.status === 'Completed' ? 'line-through text-muted-foreground' : ''}`}>{t.title}</div><RichText className="text-xs text-muted-foreground mt-1" text={t.reason} /></div>
          <select className="field !w-auto !h-9 text-xs" value={t.status} onChange={async e => { try { await upd({ data: { id: t.id, status: e.target.value } }); refresh(); } catch (er) { toast.error(msg(er)); } }}>{['Not Started', 'In Progress', 'Completed'].map(s => <option key={s}>{s}</option>)}</select></div></div>)}
      </>}
    </>; }}</Loading>;
}

export function TutorView() {
  const q = useLearning(); const ask = useServerFn(askTutor); const list = useServerFn(tutorMessages);
  const [doc, setDoc] = useState(''); const [text, setText] = useState(''); const [busy, setBusy] = useState(false);
  const msgs = useQuery({ queryKey: ['tutor', doc], queryFn: () => list({ data: { documentId: doc } }), enabled: !!doc }); const qc = useQueryClient();
  async function send() { if (!text.trim() || !doc) return; setBusy(true); try { await ask({ data: { documentId: doc, question: text } }); setText(''); qc.invalidateQueries({ queryKey: ['tutor', doc] }); } catch (e) { toast.error(msg(e)); } finally { setBusy(false); } }
  return <Loading data={q.data} error={q.error}>{() => <>
    <Heading title="Ask Your Materials" sub="Get answers grounded only in the document you select." />
    {!q.data!.documents.length ? <Empty icon={MessageSquare} title="No materials yet" text="Upload a document to start asking questions." action={uploadCta} /> : <>
      <div className="toolbar"><DocSelect data={q.data!} value={doc} onChange={setDoc} /></div>
      {doc && <><div className="min-h-[200px]">{msgs.data?.length ? msgs.data.map(m => <div key={m.id} className={`chat-message ${m.role === 'user' ? 'user' : ''}`}>{m.role === 'user' ? <div className="prose-content text-[13px] whitespace-pre-wrap">{m.content}</div> : <RichText className="prose-content text-[13px]" text={m.content} />}</div>) : !msgs.isLoading && <p className="text-sm text-muted-foreground">Ask anything about this material.</p>}{busy && <div className="chat-message"><LoaderCircle className="animate-spin text-teal" size={16} /></div>}</div>
        <div className="flex gap-3 mt-4"><textarea className="field" rows={2} maxLength={2000} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Ask a question about this material…" /><Button variant="teal" disabled={busy || !text.trim()} onClick={send}>Ask</Button></div></>}
    </>}
  </>}</Loading>;
}

export function ProfileView() {
  const q = useLearning(); const refresh = useRefresh(); const save = useServerFn(saveProfile); const [busy, setBusy] = useState(false);
  return <Loading data={q.data} error={q.error}>{() => <>
    <Heading title="Profile" sub="Manage your account details." />
    <form className="stat-card max-w-xl" onSubmit={async e => { e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); try { await save({ data: { full_name: String(f.get('full_name')), organization: String(f.get('organization')) } }); toast.success('Profile saved.'); refresh(); } catch (er) { toast.error(msg(er)); } finally { setBusy(false); } }}>
      <div className="form-field"><label className="field-label">Email</label><input className="field" value={q.data!.email} disabled /></div>
      <div className="form-field"><label className="field-label">Full name</label><input className="field" name="full_name" required maxLength={100} defaultValue={q.data!.profile.full_name} /></div>
      <div className="form-field"><label className="field-label">Organization (optional)</label><input className="field" name="organization" maxLength={200} defaultValue={q.data!.profile.organization ?? ''} /></div>
      <Button variant="teal" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : 'Save changes'}</Button>
    </form>
  </>}</Loading>;
}
