import { useEffect, useMemo, useState } from 'react';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const emptyForm = { title: '', subject: '', dueDate: '', priority: 'Medium' };

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadTasks() {
    try {
      setLoading(true);
      const response = await fetch(`${API}/api/tasks`);
      if (!response.ok) throw new Error('API request failed');
      setTasks(await response.json());
      setError('');
    } catch {
      setError('Cannot connect to the backend. Check that the API is running.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTasks(); }, []);

  const completed = tasks.filter(t => t.completed).length;
  const pending = tasks.length - completed;
  const visibleTasks = useMemo(() => tasks.filter(task => {
    const filterMatch = filter === 'All' || (filter === 'Pending' && !task.completed) ||
      (filter === 'Completed' && task.completed);
    const searchMatch = `${task.title} ${task.subject}`.toLowerCase().includes(search.toLowerCase());
    return filterMatch && searchMatch;
  }), [tasks, filter, search]);

  function updateForm(field, value) {
    setForm(previous => ({ ...previous, [field]: value }));
  }

  async function submitTask(event) {
    event.preventDefault();
    setError('');
    try {
      const url = editing ? `${API}/api/tasks/${editing}` : `${API}/api/tasks`;
      const response = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!response.ok) throw new Error('Save failed');
      setForm(emptyForm);
      setEditing(null);
      await loadTasks();
    } catch {
      setError('Could not save this task. Please try again.');
    }
  }

  function startEdit(task) {
    setEditing(task._id);
    setForm({ title: task.title, subject: task.subject, dueDate: task.dueDate, priority: task.priority });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function toggleTask(task) {
    try {
      const response = await fetch(`${API}/api/tasks/${task._id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed })
      });
      if (!response.ok) throw new Error();
      await loadTasks();
    } catch { setError('Unable to update task status.'); }
  }

  async function deleteTask(id) {
    if (!window.confirm('Delete this task?')) return;
    try {
      const response = await fetch(`${API}/api/tasks/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      await loadTasks();
    } catch { setError('Unable to delete task.'); }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-icon">✓</span><span>CampusTask</span></div>
        <span className="topbar-label">Student workspace</span>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">YOUR STUDY SPACE</p>
          <h1>Stay on top of <span>your work.</span></h1>
          <p className="hero-sub">Keep assignments organized and make every deadline count.</p>
        </div>
        <div className="hero-mark" aria-hidden="true">✦</div>
      </section>

      <section className="stats-grid" aria-label="Task overview">
        <Stat label="Total tasks" value={tasks.length} icon="▤" />
        <Stat label="Pending" value={pending} icon="◷" />
        <Stat label="Completed" value={completed} icon="✓" />
        <Stat label="Progress" value={`${tasks.length ? Math.round(completed / tasks.length * 100) : 0}%`} icon="↗" />
      </section>

      <section className="content-grid">
        <aside className="form-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">TASK DETAILS</p><h2>{editing ? 'Edit task' : 'Add a task'}</h2></div>
            <span className="panel-symbol">＋</span>
          </div>
          <form onSubmit={submitTask}>
            <label>Task title<input required maxLength="100" placeholder="e.g. Prepare networking notes" value={form.title} onChange={e => updateForm('title', e.target.value)} /></label>
            <label>Subject / course<input required maxLength="60" placeholder="e.g. Computer Networks" value={form.subject} onChange={e => updateForm('subject', e.target.value)} /></label>
            <label>Due date<input required type="date" value={form.dueDate} onChange={e => updateForm('dueDate', e.target.value)} /></label>
            <label>Priority
              <select value={form.priority} onChange={e => updateForm('priority', e.target.value)}>
                <option>Low</option><option>Medium</option><option>High</option>
              </select>
            </label>
            <div className="form-actions">
              <button className="primary-btn" type="submit">{editing ? 'Save changes' : 'Add task'} <span>→</span></button>
              {editing && <button className="cancel-btn" type="button" onClick={() => { setEditing(null); setForm(emptyForm); }}>Cancel</button>}
            </div>
          </form>
        </aside>

        <section className="tasks-panel">
          <div className="panel-heading task-heading">
            <div><p className="eyebrow">TASK LIST</p><h2>Your tasks</h2></div>
            <span className="count-pill">{tasks.length} total</span>
          </div>
          <div className="toolbar">
            <div className="search-wrap"><span>⌕</span><input aria-label="Search tasks" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <div className="filter-tabs">{['All', 'Pending', 'Completed'].map(name => <button key={name} className={filter === name ? 'active' : ''} onClick={() => setFilter(name)}>{name}</button>)}</div>
          </div>
          {error && <div className="error-box">{error}</div>}
          {loading ? <div className="empty-state">Loading tasks...</div> : visibleTasks.length === 0 ?
            <div className="empty-state"><div className="empty-icon">▤</div><strong>No tasks here yet</strong><p>Add a task or try changing your search/filter.</p></div> :
            <div className="task-list">{visibleTasks.map(task => <article className={`task-card ${task.completed ? 'is-complete' : ''}`} key={task._id}>
              <button className={`check-btn ${task.completed ? 'checked' : ''}`} onClick={() => toggleTask(task)} aria-label="Toggle task completion">{task.completed ? '✓' : ''}</button>
              <div className="task-info"><h3>{task.title}</h3><p>{task.subject} <span className="dot">•</span> Due {task.dueDate}</p><div className="task-tags"><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority} priority</span>{task.completed && <span className="done-tag">Completed</span>}</div></div>
              <div className="task-actions"><button onClick={() => startEdit(task)} aria-label="Edit task">✎</button><button onClick={() => deleteTask(task._id)} aria-label="Delete task">×</button></div>
            </article>)}</div>
        }
      </section>
    </section>

      <footer>CampusTask <span>•</span> AWT Mini Project</footer>
    </main>
  );
}

function Stat({ label, value, icon }) {
  return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><strong>{value}</strong></article>;
}

