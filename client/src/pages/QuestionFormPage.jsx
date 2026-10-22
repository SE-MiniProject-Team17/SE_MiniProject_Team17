import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import FieldError from '../components/FieldError';
import { apiError } from '../api/client';
import { createQuestion, getQuestion, updateQuestion } from '../api/questions';
import { useAuth } from '../context/AuthContext';

// Same limits as the server (SRS REQ-QB-01). The server always re-checks.
const LIMITS = { text: 500, option: 200, topic: 50, explanation: 300 };
const LABELS = ['A', 'B', 'C', 'D'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const empty = {
  text: '',
  options: ['', '', '', ''],
  correctOption: '',
  topic: '',
  difficulty: '',
  explanation: '',
};

/** Quick checks in the browser so the user sees mistakes before submitting. */
function validate(form) {
  const errors = {};
  if (!form.text.trim()) errors.text = 'Question text is required';
  else if (form.text.trim().length > LIMITS.text) errors.text = `Question text must be at most ${LIMITS.text} characters`;

  const filled = form.options.map((o) => o.trim());
  const emptyIndex = filled.findIndex((o) => !o);
  const longIndex = filled.findIndex((o) => o.length > LIMITS.option);
  if (emptyIndex !== -1) errors.options = `Option ${LABELS[emptyIndex]} is required (all 4 options must be filled)`;
  else if (longIndex !== -1) errors.options = `Option ${LABELS[longIndex]} must be at most ${LIMITS.option} characters`;
  else if (new Set(filled.map((o) => o.toLowerCase())).size !== 4) errors.options = 'Options must be 4 different answers';

  if (!form.correctOption) errors.correctOption = 'Correct option is required';

  if (!form.topic.trim()) errors.topic = 'Topic is required';
  else if (form.topic.trim().length > LIMITS.topic) errors.topic = `Topic must be at most ${LIMITS.topic} characters`;

  if (!form.difficulty) errors.difficulty = 'Difficulty is required';

  if (form.explanation.trim().length > LIMITS.explanation) {
    errors.explanation = `Explanation must be at most ${LIMITS.explanation} characters`;
  }
  return errors;
}

/**
 * #13 – Faculty adds a question (/questions/new).
 * #15 – the owner edits a question (/questions/:id/edit); same form and rules (REQ-QB-05).
 */
export default function QuestionFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    let active = true;
    getQuestion(id)
      .then((q) => {
        if (!active) return;
        if (q.owner !== user?.id) {
          setLoadError('Access denied');
          return;
        }
        setForm({
          text: q.text,
          options: [...q.options],
          correctOption: q.correctOption,
          topic: q.topic,
          difficulty: q.difficulty,
          explanation: q.explanation || '',
        });
      })
      .catch((err) => active && setLoadError(apiError(err).message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, isEdit, user?.id]);

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const setOption = (i, value) =>
    setForm((f) => ({ ...f, options: f.options.map((o, j) => (j === i ? value : o)) }));

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const data = { ...form, explanation: form.explanation.trim() };
      if (isEdit) {
        await updateQuestion(id, data);
        navigate('/questions', { state: { message: 'Question updated.' } });
      } else {
        await createQuestion({ ...data, explanation: data.explanation || undefined });
        navigate('/questions', { state: { message: 'Question saved.' } });
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
        <p><Link to="/questions">← Back to Question Bank</Link></p>
      </section>
    );
  }

  const counter = (value, max) => (
    <span className="muted small">{value.length}/{max}</span>
  );

  return (
    <section className="narrow-wide">
      <p><Link to="/questions">← Back to Question Bank</Link></p>
      <h1>{isEdit ? 'Edit question' : 'Add question'}</h1>
      {formError && <p className="alert" role="alert">{formError}</p>}

      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="text">Question text {counter(form.text, LIMITS.text)}</label>
        <textarea
          id="text"
          rows={3}
          value={form.text}
          onChange={(e) => setField('text', e.target.value)}
          aria-invalid={!!errors.text}
          aria-describedby="text-error"
        />
        <FieldError id="text-error" message={errors.text} />

        <fieldset>
          <legend>Options (select the correct one)</legend>
          {LABELS.map((label, i) => (
            <div className="option-row" key={label}>
              <input
                type="radio"
                name="correctOption"
                id={`correct-${label}`}
                value={label}
                checked={form.correctOption === label}
                onChange={() => setField('correctOption', label)}
                aria-label={`Option ${label} is correct`}
              />
              <label htmlFor={`option-${label}`} className="option-label">{label}</label>
              <input
                id={`option-${label}`}
                value={form.options[i]}
                onChange={(e) => setOption(i, e.target.value)}
                aria-invalid={!!errors.options}
              />
            </div>
          ))}
          <FieldError message={errors.options} />
          <FieldError message={errors.correctOption} />
        </fieldset>

        <label htmlFor="topic">Topic {counter(form.topic, LIMITS.topic)}</label>
        <input
          id="topic"
          value={form.topic}
          onChange={(e) => setField('topic', e.target.value)}
          aria-invalid={!!errors.topic}
        />
        <FieldError message={errors.topic} />

        <label htmlFor="difficulty">Difficulty</label>
        <select
          id="difficulty"
          value={form.difficulty}
          onChange={(e) => setField('difficulty', e.target.value)}
          aria-invalid={!!errors.difficulty}
        >
          <option value="">Select…</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <FieldError message={errors.difficulty} />

        <label htmlFor="explanation">
          Explanation <span className="muted">(optional)</span> {counter(form.explanation, LIMITS.explanation)}
        </label>
        <textarea
          id="explanation"
          rows={2}
          value={form.explanation}
          onChange={(e) => setField('explanation', e.target.value)}
          aria-invalid={!!errors.explanation}
        />
        <FieldError message={errors.explanation} />

        <button type="submit" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save question'}</button>
      </form>
    </section>
  );
}
