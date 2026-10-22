
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAttemptResult } from '../api/attempts';

export default function AttemptResultPage() {
  const { attemptId } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadResult() {
      try {
        const data = await getAttemptResult(attemptId);
        if (active) setResult(data);
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.error?.message ||
              'Could not load this result. Please try again.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadResult();
    return () => {
      active = false;
    };
  }, [attemptId]);

  if (loading) return <p>Loading your result...</p>;

  if (error) {
    return (
      <section>
        <h1>Quiz Result</h1>
        <p role="alert">{error}</p>
        <Link to="/quizzes">Back to quizzes</Link>
      </section>
    );
  }

  if (!result) return null;

  const answers = result.answers || [];
  const score = result.score ?? 0;
  const total = result.totalQuestions ?? answers.length;
  const percentage =
    result.percentage ?? (total ? (score / total) * 100 : 0);

  return (
    <section>
      <div className="page-header">
        <h1>Quiz Result</h1>
        <Link to="/quizzes">Back to quizzes</Link>
      </div>

      <section aria-label="Score summary">
        <h2>
          Score: {score} / {total}
        </h2>
        <p>Percentage: {Number(percentage).toFixed(2)}%</p>
        <p>
          Correct answers: {answers.filter((answer) => answer.isCorrect).length}
        </p>
      </section>

      <h2>Answer review</h2>

      {answers.length === 0 ? (
        <p>No answer details are available for this attempt.</p>
      ) : (
        answers.map((answer, index) => (
          <article
            key={answer.questionId || index}
            className="card"
            style={{ marginBottom: '1rem', padding: '1rem' }}
          >
            <h3>
              {index + 1}. {answer.questionText}
            </h3>

            <p>
              Your answer:{' '}
              <strong>
                {answer.selectedOption
                  ? `${answer.selectedOption}. ${
                      answer.options?.[
                        ['A', 'B', 'C', 'D'].indexOf(answer.selectedOption)
                      ] || ''
                    }`
                  : 'Not answered'}
              </strong>
            </p>

            <p>
              Correct answer:{' '}
              <strong>
                {answer.correctOption}.{' '}
                {answer.options?.[
                  ['A', 'B', 'C', 'D'].indexOf(answer.correctOption)
                ] || ''}
              </strong>
            </p>

            <p>
              Result:{' '}
              <strong>
                {answer.isCorrect ? 'Correct' : 'Incorrect'}
              </strong>
            </p>

            {answer.explanation && (
              <p>
                <strong>Explanation:</strong> {answer.explanation}
              </p>
            )}
          </article>
        ))
      )}
    </section>
  );
}
