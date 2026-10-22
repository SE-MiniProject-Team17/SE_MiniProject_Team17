
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getQuizForAttempt } from '../api/quizzes';
import { submitAttempt } from '../api/attempts';

export default function QuizAttemptPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getQuizForAttempt(quizId)
      .then((data) => {
        if (active) setQuiz(data);
      })
      .catch((err) => {
        if (active) {
          setError(
            err.response?.data?.error?.message ||
              'Could not load this quiz.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [quizId]);

  function selectAnswer(questionId, selectedOption) {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: selectedOption,
    }));
  }

  async function handleSubmit() {
    if (!quiz || submitting) return;

    const unanswered = quiz.questions.filter(
      (question) => !answers[question.id]
    ).length;

    if (
      unanswered > 0 &&
      !window.confirm(
        `You have ${unanswered} unanswered question(s). Submit anyway?`
      )
    ) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const result = await submitAttempt(
        quiz.id,
        quiz.questions.map((question) => ({
          questionId: question.id,
          selectedOption: answers[question.id] || null,
        }))
      );

      navigate(`/quizzes/attempts/${result.id}/result`, {
        replace: true,
      });
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          'Could not submit your quiz. Please try again.'
      );
      setSubmitting(false);
    }
  }

  if (loading) return <p>Loading quiz...</p>;

  if (error && !quiz) {
    return (
      <section>
        <h1>Quiz unavailable</h1>
        <p role="alert">{error}</p>
        <Link to="/quizzes">Back to quizzes</Link>
      </section>
    );
  }

  if (!quiz) return null;

  return (
    <section>
      <h1>{quiz.title}</h1>
      <p>
        Answered: {Object.keys(answers).length} / {quiz.questions.length}
      </p>

      {error && <p role="alert">{error}</p>}

      {quiz.questions.map((question, index) => (
        <article
          className="card"
          key={question.id}
          style={{ marginBottom: '1rem', padding: '1rem' }}
        >
          <h2>
            {index + 1}. {question.text}
          </h2>

          {question.options.map((option, optionIndex) => {
            const label = ['A', 'B', 'C', 'D'][optionIndex];

            return (
              <label
                key={label}
                style={{ display: 'block', margin: '0.75rem 0' }}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={label}
                  checked={answers[question.id] === label}
                  onChange={() => selectAnswer(question.id, label)}
                  disabled={submitting}
                />{' '}
                {label}. {option}
              </label>
            );
          })}
        </article>
      ))}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? 'Submitting...' : 'Submit Quiz'}
      </button>
    </section>
  );
}
