import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiError } from '../api/client';
import {
  getQuizAttempt,
  saveQuizAnswer,
  submitQuizAttempt,
} from '../api/quizzes';

export default function QuizAttemptPage() {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);

  const loadAttempt = useCallback(async () => {
    try {
      const data = await getQuizAttempt(attemptId);
      setAttempt(data);
      setError('');
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    loadAttempt();
  }, [loadAttempt]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const finishAttempt = useCallback(async (automatic = false) => {
    if (submittingRef.current || !attempt || attempt.status === 'Completed') return;

    submittingRef.current = true;
    setSubmitting(true);
    setError('');

    try {
      const result = await submitQuizAttempt(attemptId);
      setAttempt(result);
    } catch (err) {
      setError(apiError(err).message);
      submittingRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }, [attempt, attemptId]);

  const deadline = attempt
    ? new Date(attempt.expiresAt).getTime()
    : 0;
  const remaining = attempt?.status === 'Completed'
    ? 0
    : Math.max(0, Math.ceil((deadline - now) / 1000));

  useEffect(() => {
    if (attempt?.status === 'InProgress' && remaining <= 0) {
      finishAttempt(true);
    }
  }, [attempt?.status, remaining, finishAttempt]);

  async function changeAnswer(questionId, selectedOption) {
    if (!attempt || attempt.status !== 'InProgress' || saving || submitting || remaining <= 0) return;

    const previous = attempt;
    setSaving(true);
    setError('');

    try {
      await saveQuizAnswer(attemptId, questionId, selectedOption);
      setAttempt((current) => current ? ({
        ...current,
        questions: current.questions.map((question) =>
          question.position === questionId
            ? { ...question, selectedOption }
            : question
        ),
        unansweredQuestionIds: current.questions
          .filter((question) => question.position === questionId
            ? selectedOption == null
            : question.selectedOption == null)
          .map((question) => question.position),
      }) : current);
    } catch (err) {
      setAttempt(previous);
      setError(apiError(err).message);
      await loadAttempt();
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!attempt || attempt.status !== 'InProgress' || submitting || saving) return;

    const unanswered = attempt.questions.filter(
      (question) => question.selectedOption == null
    ).length;

    if (unanswered > 0 &&
        !window.confirm(
          `You have ${unanswered} unanswered question(s). Submit anyway?`
        )) {
      return;
    }

    await finishAttempt();
  }

  if (loading) return <section><p className="muted">Loading quiz...</p></section>;

  if (!attempt) {
    return (
      <section>
        <h1>Quiz attempt</h1>
        {error && <p className="alert" role="alert">{error}</p>}
        <button type="button" onClick={loadAttempt}>Retry</button>
        <p><Link to="/quizzes">Back to quizzes</Link></p>
      </section>
    );
  }

  const completed = attempt.status === 'Completed';
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <section>
      <div className="page-header">
        <h1>{attempt.title}</h1>
        {completed
          ? <p className="success" role="status">Attempt submitted</p>
          : <p role="timer" aria-live="off">
              Time remaining: <strong>{minutes}:{String(seconds).padStart(2, '0')}</strong>
            </p>}
      </div>

      {error && <p className="alert" role="alert">{error}</p>}
      {saving && <p className="muted" role="status">Saving answer...</p>}
      {submitting && <p className="muted" role="status">Submitting attempt...</p>}

      {completed && (
        <div className="success" role="status">
          <h2>Results</h2>
          <p>Score: {attempt.score} / {attempt.totalQuestions}</p>
          <p>Percentage: {attempt.percentage}%</p>
        </div>
      )}

      {attempt.questions.map((question, index) => (
        <article key={question.position} className="card">
          <h2>Question {index + 1}</h2>
          <p>{question.text}</p>

          {question.options.map((option, optionIndex) => {
            const letter = ['A', 'B', 'C', 'D'][optionIndex];
            const selected = question.selectedOption === letter;

            return (
              <label key={letter} className="quiz-option">
                <input
                  type="radio"
                  name={`question-${question.position}`}
                  value={letter}
                  checked={selected}
                  disabled={completed || saving || submitting || remaining <= 0}
                  onChange={() => changeAnswer(question.position, letter)}
                />
                <span>{letter}. {option}</span>
              </label>
            );
          })}

          {!completed && question.selectedOption != null && (
            <button
              type="button"
              className="secondary"
              disabled={saving || submitting || remaining <= 0}
              onClick={() => changeAnswer(question.position, null)}
            >
              Clear answer
            </button>
          )}

          {completed && (
            <div>
              <p>
                Your answer: {question.selectedOption || 'Unanswered'}
                {' — '}
                {question.selectedOption === question.correctOption
                  ? 'Correct'
                  : 'Incorrect'}
              </p>
              <p>Correct answer: {question.correctOption}</p>
              {question.explanation && <p>{question.explanation}</p>}
            </div>
          )}
        </article>
      ))}

      {!completed ? (
        <button
          type="button"
          disabled={saving || submitting || (remaining <= 0 && !error)}
          onClick={handleSubmit}
        >
          {submitting
            ? 'Submitting...'
            : remaining <= 0 && error
              ? 'Retry submission'
              : 'Submit quiz'}
        </button>
      ) : (
        <p><Link to="/quizzes">Back to quizzes</Link></p>
      )}
    </section>
  );
}
