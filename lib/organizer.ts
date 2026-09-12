export type Area = 'Work' | 'Personal' | 'Health' | 'Home';
export type Task = { id: string; title: string; area: Area; date: string; priority: 'Normal' | 'High'; minutes: number; notes: string; done: boolean; completedOn?: string; focus: boolean };
export type Workspace = { version: 1; tasks: Task[]; note: string; intention: string; review: string[]; name: string; sample: boolean };
export const STORAGE_KEY = 'daylight.workspace.v1';
export const areas: Area[] = ['Work', 'Personal', 'Health', 'Home'];
export function day(offset = 0) { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function initialWorkspace(): Workspace {
  const task = (id: string, title: string, area: Area, offset: number | null, minutes: number, focus = false, done = false): Task => ({ id, title, area, date: offset === null ? '' : day(offset), minutes, focus, done, completedOn: done ? day() : undefined, priority: focus ? 'High' : 'Normal', notes: '' });
  return { version: 1, name: 'Cristian', sample: true, intention: 'Make room for what matters.', note: '', review: [], tasks: [
    task('s1','Map out my priorities for next week','Work',0,25,true),
    task('s2','Book that appointment I’ve been putting off','Personal',0,10),
    task('s3','Get outside for a 30-minute walk','Health',0,30),
    task('s4','Clear my desk, clear my head','Home',0,10,false,true),
    task('s5','Review subscriptions and monthly expenses','Personal',2,20),
    task('s6','Plan a few easy meals for the week','Home',1,20),
    task('s7','Outline the next step for my website','Work',3,45),
    task('s8','Find a book I actually want to read','Personal',null,10),
    task('s9','Ideas for a better morning routine','Health',null,15),
  ] };
}
export function isWorkspace(value: unknown): value is Workspace {
  if (!value || typeof value !== 'object') return false;
  const w = value as Workspace;
  return w.version === 1 && typeof w.name === 'string' && typeof w.sample === 'boolean' && typeof w.note === 'string' && typeof w.intention === 'string' && Array.isArray(w.review) && w.review.every(x=>typeof x==='string') && Array.isArray(w.tasks) && w.tasks.every(t => t && typeof t.id === 'string' && typeof t.title === 'string' && areas.includes(t.area) && typeof t.date === 'string' && (!t.date || /^\d{4}-\d{2}-\d{2}$/.test(t.date)) && ['Normal','High'].includes(t.priority) && typeof t.minutes === 'number' && t.minutes >= 0 && Number.isFinite(t.minutes) && typeof t.notes === 'string' && typeof t.done === 'boolean' && typeof t.focus === 'boolean');
}
