import {childTasks, isBundleTask, isMeetingComplete, isRootTask, isTodayEntry, localDateTime, matchesSearch, Priority, rootDueAt, WorkTask} from './workroom';

export type SmartPlace = 'today' | 'inbox' | 'upcoming' | 'tasks' | 'done' | 'notes' | 'calendar';
export type Place = {kind: 'smart'; id: SmartPlace} | {kind: 'project'; name: string};
export type FilterChip = 'overdue' | 'dueToday' | 'highPriority' | 'hasReminder';
export type SortMode = 'recommended' | 'due' | 'newest' | 'priority';
export type GroupBy = 'none' | 'project' | 'priority' | 'date';
export type ListPrefs = {place: string; sort: SortMode; groupBy: GroupBy; showCompleted: boolean};

export const LIST_PREFS_KEY = 'workroom.listPrefs.v1';
export const SMART_PLACES: {id: Exclude<SmartPlace, 'notes' | 'calendar'>; label: string}[] = [
  {id: 'tasks', label: 'My tasks'},
  {id: 'today', label: 'Today'},
  {id: 'inbox', label: 'No date'},
  {id: 'upcoming', label: 'Upcoming'},
  {id: 'done', label: 'Done'},
];
export const FILTER_CHIPS: {id: FilterChip; label: string}[] = [
  {id: 'overdue', label: 'Overdue'},
  {id: 'dueToday', label: 'Due today'},
  {id: 'highPriority', label: 'High priority'},
  {id: 'hasReminder', label: 'Has reminder'},
];
export const SORT_OPTIONS: {id: SortMode; label: string}[] = [
  {id: 'recommended', label: 'Recommended'},
  {id: 'due', label: 'Due date'},
  {id: 'newest', label: 'Newest'},
  {id: 'priority', label: 'Priority'},
];
export const GROUP_OPTIONS: {id: GroupBy; label: string}[] = [
  {id: 'none', label: 'None'},
  {id: 'project', label: 'Project'},
  {id: 'priority', label: 'Priority'},
  {id: 'date', label: 'Date'},
];

const SMART_IDS: SmartPlace[] = ['today', 'inbox', 'upcoming', 'tasks', 'done', 'notes', 'calendar'];
const SORT_IDS: SortMode[] = ['recommended', 'due', 'newest', 'priority'];
const GROUP_IDS: GroupBy[] = ['none', 'project', 'priority', 'date'];
const PRIORITY_RANK: Record<Priority, number> = {High: 0, Medium: 1, Low: 2};
const PLACE_LABELS: Record<SmartPlace, string> = {
  today: 'Today',
  inbox: 'No date',
  upcoming: 'Upcoming',
  tasks: 'My tasks',
  done: 'Done',
  notes: 'Notes',
  calendar: 'Calendar',
};

export function tasksPlace(): Place {
  return {kind: 'smart', id: 'tasks'};
}

export function isSmart(place: Place, id: SmartPlace): boolean {
  return place.kind === 'smart' && place.id === id;
}

export function isTaskSurface(place: Place): boolean {
  return place.kind === 'project' || (place.id !== 'notes' && place.id !== 'calendar');
}

export function projectNameOf(place: Place): string | null {
  return place.kind === 'project' ? place.name : null;
}

export function placeId(place: Place): string {
  return place.kind === 'project' ? `project:${place.name}` : place.id;
}

export function placeTitle(place: Place, search = ''): string {
  if (search.trim()) return 'Search results';
  return place.kind === 'project' ? place.name : PLACE_LABELS[place.id];
}

export function parsePlace(value: string, projects: string[] = []): Place {
  if (value.startsWith('project:')) {
    const name = value.slice(8);
    if (projects.includes(name)) return {kind: 'project', name};
    return tasksPlace();
  }
  if ((SMART_IDS as string[]).includes(value)) return {kind: 'smart', id: value as SmartPlace};
  if (projects.includes(value)) return {kind: 'project', name: value};
  return tasksPlace();
}

export function samePlace(a: Place, b: Place): boolean {
  return placeId(a) === placeId(b);
}

export function defaultListPrefs(): ListPrefs {
  return {place: 'tasks', sort: 'recommended', groupBy: 'none', showCompleted: false};
}

export function parseListPrefs(value: unknown): ListPrefs | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const place = typeof raw.place === 'string' ? raw.place : '';
  const sort = (SORT_IDS as string[]).includes(String(raw.sort)) ? raw.sort as SortMode : 'recommended';
  const groupBy = (GROUP_IDS as string[]).includes(String(raw.groupBy)) ? raw.groupBy as GroupBy : 'none';
  const showCompleted = raw.showCompleted === true;
  if (!place) return null;
  return {place, sort, groupBy, showCompleted};
}

export function loadListPrefs(): ListPrefs | null {
  if (typeof window === 'undefined') return null;
  try {
    return parseListPrefs(JSON.parse(localStorage.getItem(LIST_PREFS_KEY) || 'null'));
  } catch {
    return null;
  }
}

export function saveListPrefs(prefs: ListPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LIST_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* Ignore quota or private-mode failures; the session still works. */
  }
}

export function availableGroupBy(place: Place): GroupBy[] {
  if (isSmart(place, 'done') || isSmart(place, 'upcoming')) return [];
  if (place.kind === 'project') return ['none', 'priority', 'date'];
  if (isSmart(place, 'inbox')) return ['none', 'project', 'priority'];
  return ['none', 'project', 'priority', 'date'];
}

export function effectiveGroupBy(place: Place, groupBy: GroupBy, search = ''): GroupBy {
  if (search.trim()) return 'none';
  if (isSmart(place, 'done')) return 'none';
  if (isSmart(place, 'upcoming')) return 'date';
  const allowed = availableGroupBy(place);
  if (!allowed.length) return 'none';
  return allowed.includes(groupBy) ? groupBy : 'none';
}

export function effectiveSort(place: Place, sort: SortMode): SortMode {
  if (isSmart(place, 'upcoming')) return 'due';
  return sort;
}

export function sortLocked(place: Place): boolean {
  return isSmart(place, 'upcoming');
}

export function itemIsOpen(task: WorkTask, tasks: WorkTask[], place: Place): boolean {
  if (isSmart(place, 'today') || !isBundleTask(task)) return !task.done;
  return !isMeetingComplete(tasks, task.id);
}

export function inspectTasks(task: WorkTask, tasks: WorkTask[]): WorkTask[] {
  return isBundleTask(task) ? [task, ...childTasks(tasks, task.id)] : [task];
}

export function dueDay(value: string): string {
  return value ? value.slice(0, 10) : '';
}

export function isOverdueTask(task: WorkTask, now: number): boolean {
  return !!task.dueAt && new Date(task.dueAt).getTime() < now;
}

export function matchesFilterChips(task: WorkTask, tasks: WorkTask[], chips: FilterChip[], today: string, now: number): boolean {
  if (!chips.length) return true;
  const inspect = inspectTasks(task, tasks);
  return chips.every(chip => {
    if (chip === 'overdue') return inspect.some(item => isOverdueTask(item, now));
    if (chip === 'dueToday') return inspect.some(item => dueDay(item.dueAt) === today);
    if (chip === 'hasReminder') return inspect.some(item => !!item.remindAt);
    return inspect.some(item => item.priority === 'High');
  });
}

export function itemsForPlace(tasks: WorkTask[], place: Place, search: string, today: string): WorkTask[] {
  if (search.trim()) return tasks.filter(task => isRootTask(task) && matchesSearch(task, tasks, search));
  if (place.kind === 'project') return tasks.filter(task => isRootTask(task) && task.project === place.name);
  if (place.id === 'today') return tasks.filter(task => isTodayEntry(task, today));
  if (place.id === 'inbox') return tasks.filter(task => isRootTask(task) && !rootDueAt(task, tasks));
  if (place.id === 'upcoming') return tasks.filter(task => isRootTask(task) && !!rootDueAt(task, tasks));
  if (place.id === 'done') return tasks.filter(task => isRootTask(task) && (isBundleTask(task) ? isMeetingComplete(tasks, task.id) : task.done));
  return tasks.filter(isRootTask);
}

export function sortItems(items: WorkTask[], tasks: WorkTask[], place: Place, sort: SortMode): WorkTask[] {
  const mode = effectiveSort(place, sort);
  const dueOf = (task: WorkTask) => rootDueAt(task, tasks) || '9999';
  return [...items].sort((a, b) => {
    if (mode === 'newest') return b.createdAt.localeCompare(a.createdAt);
    if (mode === 'due') return dueOf(a).localeCompare(dueOf(b));
    if (mode === 'priority') return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || dueOf(a).localeCompare(dueOf(b));
    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || dueOf(a).localeCompare(dueOf(b));
  });
}

function formatDueHeading(due: string, today: string): string {
  if (!due) return 'Unscheduled';
  const day = dueDay(due);
  const label = new Date(`${day}T12:00`).toLocaleDateString('en-US', {weekday: 'long', month: 'short', day: 'numeric'});
  if (day < today) return `Overdue · ${label}`;
  if (day === today) return 'Today';
  return label;
}

export function groupKey(task: WorkTask, tasks: WorkTask[], place: Place, groupBy: GroupBy, search: string, today: string): string {
  if (search.trim()) return 'Search results';
  const mode = effectiveGroupBy(place, groupBy, search);
  if (mode === 'project') return task.project || 'General';
  if (mode === 'priority') return `${task.priority} priority`;
  if (mode === 'date') return formatDueHeading(rootDueAt(task, tasks), today);
  if (isSmart(place, 'today')) return 'Today';
  if (isSmart(place, 'inbox')) return 'Unscheduled';
  if (isSmart(place, 'done')) return 'Completed';
  return 'Tasks';
}

export function quietGroup(place: Place, groupBy: GroupBy, search: string, label: string): boolean {
  if (search.trim() || label === 'Completed') return false;
  return effectiveGroupBy(place, groupBy, search) === 'none' && !isSmart(place, 'done');
}

export function emptyCopy(place: Place, search: string, hasFilters: boolean): {title: string; body: string} {
  if (search.trim()) return {title: 'No matching tasks.', body: 'Try a task name, project, or a word from your notes.'};
  if (hasFilters) return {title: 'No tasks match these filters.', body: 'Clear a filter to see more work in this place.'};
  if (place.kind === 'project') return {title: 'This project is ready.', body: 'Add the first task for this project.'};
  if (place.id === 'today') return {title: 'Nothing planned for today.', body: 'Use the star beside a task to plan it for today. Deadlines stay separate.'};
  if (place.id === 'inbox') return {title: 'Nothing without a date.', body: 'Tasks without a due date land here.'};
  if (place.id === 'upcoming') return {title: 'Nothing due upcoming.', body: 'Give a task a due date to see it here.'};
  if (place.id === 'done') return {title: 'No completed tasks yet.', body: 'Finished work will collect here.'};
  return {title: 'Nothing here yet.', body: 'Add a task to get started.'};
}

export function composerDefaults(place: Place): {project: string; dueAt: string; starToday: boolean} {
  if (place.kind === 'project') return {project: place.name, dueAt: '', starToday: false};
  if (place.id === 'today') return {project: 'General', dueAt: '', starToday: true};
  if (place.id === 'upcoming') return {project: 'General', dueAt: localDateTime(), starToday: false};
  return {project: 'General', dueAt: '', starToday: false};
}

export function displaySummary(place: Place, sort: SortMode, groupBy: GroupBy, chips: FilterChip[], showCompleted: boolean): string {
  const parts: string[] = [];
  for (const chip of chips) {
    const found = FILTER_CHIPS.find(item => item.id === chip);
    if (found) parts.push(found.label);
  }
  const grouping = effectiveGroupBy(place, groupBy);
  if (grouping !== 'none') parts.push(`Grouped by ${grouping}`);
  const sorting = effectiveSort(place, sort);
  if (!sortLocked(place) && sorting !== 'recommended') {
    const found = SORT_OPTIONS.find(item => item.id === sorting);
    if (found) parts.push(found.label);
  }
  if (showCompleted && !isSmart(place, 'done')) parts.push('Completed');
  return parts.join(' · ');
}

export function projectOpenCount(tasks: WorkTask[], project: string, today: string): number {
  const place: Place = {kind: 'project', name: project};
  return itemsForPlace(tasks, place, '', today).filter(task => itemIsOpen(task, tasks, place)).length;
}

export function buildTaskList(options: {
  tasks: WorkTask[];
  place: Place;
  search: string;
  chips: FilterChip[];
  sort: SortMode;
  groupBy: GroupBy;
  showCompleted: boolean;
  today: string;
  now: number;
}): {groups: [string, WorkTask[]][]; filtered: WorkTask[]; openItems: WorkTask[]; completedItems: WorkTask[]} {
  const {tasks, place, search, chips, sort, groupBy, showCompleted, today, now} = options;
  const filtered = sortItems(itemsForPlace(tasks, place, search, today).filter(task => matchesFilterChips(task, tasks, chips, today, now)), tasks, place, sort);
  const openItems = isSmart(place, 'done') ? [] : filtered.filter(task => itemIsOpen(task, tasks, place));
  const completedItems = isSmart(place, 'done') ? filtered : filtered.filter(task => !itemIsOpen(task, tasks, place));
  const groups = new Map<string, WorkTask[]>();
  for (const task of openItems) {
    const key = groupKey(task, tasks, place, groupBy, search, today);
    groups.set(key, [...(groups.get(key) || []), task]);
  }
  if ((isSmart(place, 'done') || search || showCompleted) && completedItems.length) {
    groups.set('Completed', completedItems);
  }
  return {groups: Array.from(groups.entries()), filtered, openItems, completedItems};
}
