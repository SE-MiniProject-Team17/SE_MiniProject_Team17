
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getQuizzes } from '../api/quizzes';

export default function QuizListPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getQuizzes()
      .then((data) => {
        if (active) setQuizzes(data);
      })
      .catch((err) => {
        if (active) {
          setError(
            err.response?.data?.error?.message ||
              'Could not load quizzes. Please try again.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section>
      <div className="page-header">
        <h1>Available Quizzes</h1>
          <Link to="/attempt-history">View Attempt History</Link>
      </div>

      {loading && <p>Loading quizzes...</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && !error && quizzes.length === 0 && (
        <p>No quizzes are available yet.</p>
      )}

      {quizzes.map((quiz) => (
        <article
          className="card"
          key={quiz.id}
          style={{ marginBottom: '1rem', padding: '1rem' }}
        >
          <h2>{quiz.title}</h2>
          <p>Questions: {quiz.totalQuestions}</p>

          {quiz.attempted ? (
            <p>You have already submitted this quiz.</p>
          ) : (
            <Link to={`/quizzes/${quiz.id}/attempt`}>
              Start Quiz
            </Link>
          )}
        </article>
      ))}
    </section>
  );
}
