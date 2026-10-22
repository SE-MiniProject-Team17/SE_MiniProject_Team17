import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import FieldError from '../components/FieldError';
import { apiError } from '../api/client';
import { listTopics, searchQuestions } from '../api/questions';
import { createQuiz, getQuiz, updateQuiz } from '../api/quizzes';
import { fromLocalInput, toLocalInput } from '../utils/dates';

// Same rules as the server (SRS REQ-QZ-01/02). The server always re-checks.
const LIMITS = { title: 100, description: 300, timeMin: 5, timeMax: 180, questionsMax: 50 };
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const empty = { title: '', description: '', timeLimitMinutes: 30, availableFrom: '', availableUntil: '' };

function validate(form, selected) {
  const e = {};
  if (!form.title.trim()) e.title = 'Title is required';
  else if (form.title.trim().length > LIMITS.title) e.title = `Title must be at most ${LIMITS.title} characters`;
  if (form.description.trim().length > LIMITS.description) {
    e.description = `Description must be at most ${LIMITS.description} characters`;
  }
  const t = Number(form.timeLimitMinutes);
  if (!Number.isInteger(t) || t < LIMITS.timeMin || t > LIMITS.timeMax) {
    e.timeLimitMinutes = `Time limit must be a whole number between ${LIMITS.timeMin} and ${LIMITS.timeMax} minutes`;
  }
  if (!form.availableFrom) e.availableFrom = 'Availability start is required';
  if (!form.availableUntil) e.availableUntil = 'Availability end is required';
  else if (form.availableFrom && new Date(form.availableUntil) <= new Date(form.availableFrom)) {
    e.availableUntil = 'Availability end must be later than the availability start';
  }
  if (selected.length < 1 || selected.length > LIMITS.questionsMax) {
    e.questionIds = `Select between 1 and ${LIMITS.questionsMax} questions`;
  }
  return e;
}

/**
 * #16 – create a quiz (/quizzes/new) or edit a Draft (/quizzes/:id/edit).
 * Questions are picked from the question bank (search + filters from #14).
 */
export default function QuizFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(empty);
  const [selected, setSelected] = useState([]); // [{ id, text, topic, difficulty }]
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');

  // question picker
  const [keyword, setKeyword] = useState('');
  const [filters, setFilters] = useState({ q: '', topic: '', difficulty: '' });
  const [topics, setTopics] = useState([]);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    listTopics().then(setTopics).catch(() => setTopics([]));
  }, []);

  useEffect(() => {
    let active = true;
    setSearching(true);
    searchQuestions({ ...filters, limit: 20 })
      .then((r) => active && setResults(r.questions))
      .catch(() => active && setResults([]))
      .finally(() => active && setSearching(false));
    return () => {
      active = false;
    };
  }, [filters]);

  useEffect(() => {
    if (!isEdit) return;
    let active = true;
    getQuiz(id)
      .then((quiz) => {
        if (!active) return;
        if (quiz.status !== 'Draft') {
          setLoadError('Only Draft quizzes can be edited');
          return;
        }
        setForm({
          title: quiz.title,
          description: quiz.description || '',
          timeLimitMinutes: quiz.timeLimitMinutes,
          availableFrom: toLocalInput(quiz.availableFrom),
          availableUntil: toLocalInput(quiz.availableUntil),
        });
        setSelected(
          quiz.questions.map((q) => ({
            id: q.id,
            text: q.unavailable ? 'Question unavailable – remove it' : q.text,
            topic: q.topic || '',
            difficulty: q.difficulty || '',
            unavailable: q.unavailable,
          }))
        );
      })
      .catch((err) => active && setLoadError(apiError(err).message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, isEdit]);

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const isSelected = (qid) => selected.some((s) => s.id === qid);
  const addQuestion = (q) => {
    if (isSelected(q.id) || selected.length >= LIMITS.questionsMax) return;
    setSelected((s) => [...s, { id: q.id, text: q.text, topic: q.topic, difficulty: q.difficulty }]);
  };
  const removeQuestion = (qid) => setSelected((s) => s.filter((x) => x.id !== qid));

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    const found = validate(form, selected);
    setErrors(found);
    if (Object.keys(found).length) return;

    const data = {
      title: form.title.trim(),
      description: form.description.trim(),
      timeLimitMinutes: Number(form.timeLimitMinutes),
      availableFrom: fromLocalInput(form.availableFrom),
      availableUntil: fromLocalInput(form.availableUntil),
      questionIds: selected.map((s) => s.id),
    };
    setSaving(true);
    try {
      if (isEdit) {
        await updateQuiz(id, data);
        navigate('/quizzes', { state: { message: 'Draft updated.' } });
      } else {
        await createQuiz(data);
        navigate('/quizzes', { state: { message: 'Quiz saved as Draft.' } });
      }
    } catch (err) {
      const { field, message } = apiError(err);
      if (field) setErrors({ [field]: message });
      else setFormError(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (loadError) {
    return (
      <section>
        <p className="alert" role="alert">{loadError}</p>
        <p><Link to="/quizzes">← Back to My quizzes</Link></p>
      </section>
    );
  }

  return (
    <section className="narrow-wide">
      <p><Link to="/quizzes">← Back to My quizzes</Link></p>
      <h1>{isEdit ? 'Edit Draft quiz' : 'Create quiz'}</h1>
      {formError && <p className="alert" role="alert">{formError}</p>}

      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="title">Title <span className="muted small">{form.title.length}/{LIMITS.title}</span></label>
        <input id="title" value={form.title} onChange={(e) => setField('title', e.target.value)} aria-invalid={!!errors.title} />
        <FieldError message={errors.title} />

        <label htmlFor="description">
          Description <span className="muted">(optional)</span>{' '}
          <span className="muted small">{form.description.length}/{LIMITS.description}</span>
        </label>
        <textarea id="description" rows={2} value={form.description} onChange={(e) => setField('description', e.target.value)} />
        <FieldError message={errors.description} />

        <label htmlFor="timeLimitMinutes">Time limit (minutes, {LIMITS.timeMin}–{LIMITS.timeMax})</label>
        <input
          id="timeLimitMinutes"
          type="number"
          min={LIMITS.timeMin}
          max={LIMITS.timeMax}
          value={form.timeLimitMinutes}
          onChange={(e) => setField('timeLimitMinutes', e.target.value)}
          aria-invalid={!!errors.timeLimitMinutes}
        />
        <FieldError message={errors.timeLimitMinutes} />

        <div className="two-cols">
          <div>
            <label htmlFor="availableFrom">Available from</label>
            <input id="availableFrom" type="datetime-local" value={form.availableFrom} onChange={(e) => setField('availableFrom', e.target.value)} />
            <FieldError message={errors.availableFrom} />
          </div>
          <div>
            <label htmlFor="availableUntil">Available until</label>
            <input id="availableUntil" type="datetime-local" value={form.availableUntil} onChange={(e) => setField('availableUntil', e.target.value)} />
            <FieldError message={errors.availableUntil} />
          </div>
        </div>

        <fieldset>
          <legend>Selected questions ({selected.length}/{LIMITS.questionsMax})</legend>
          {selected.length === 0 ? (
            <p className="muted small">No questions selected yet. Add them from the question bank below.</p>
          ) : (
            <ol className="selected-list">
              {selected.map((q) => (
                <li key={q.id} className={q.unavailable ? 'field-error' : undefined}>
                  <span>{q.text}</span>
                  <button type="button" className="link-button danger-link" onClick={() => removeQuestion(q.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ol>
          )}
          <FieldError message={errors.questionIds} />
        </fieldset>

        <fieldset>
          <legend>Question bank</legend>
          <div className="search-bar" role="search">
            <label htmlFor="pick-q" className="visually-hidden">Keyword</label>
            <input
              id="pick-q"
              type="search"
              placeholder="Search question text…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setFilters((f) => ({ ...f, q: keyword.trim() }));
                }
              }}
            />
            <button type="button" onClick={() => setFilters((f) => ({ ...f, q: keyword.trim() }))}>Search</button>
          </div>
          <div className="filters">
            <label htmlFor="pick-topic">
              Topic
              <select id="pick-topic" value={filters.topic} onChange={(e) => setFilters((f) => ({ ...f, topic: e.target.value }))}>
                <option value="">All topics</option>
                {topics.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label htmlFor="pick-difficulty">
              Difficulty
              <select id="pick-difficulty" value={filters.difficulty} onChange={(e) => setFilters((f) => ({ ...f, difficulty: e.target.value }))}>
                <option value="">All</option>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
          </div>
          {searching ? (
            <p className="muted small">Loading…</p>
          ) : results.length === 0 ? (
            <p className="empty">No questions found</p>
          ) : (
            <ul className="pick-list">
              {results.map((q) => (
                <li key={q.id}>
                  <span>
                    {q.text} <span className="muted small">· {q.topic} · {q.difficulty}</span>
                  </span>
                  {isSelected(q.id) ? (
                    <span className="muted small">Added</span>
                  ) : (
                    <button type="button" className="secondary" onClick={() => addQuestion(q)} disabled={selected.length >= LIMITS.questionsMax}>
                      Add
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <button type="submit" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save Draft' : 'Save as Draft'}</button>
      </form>
    </section>
  );
}
