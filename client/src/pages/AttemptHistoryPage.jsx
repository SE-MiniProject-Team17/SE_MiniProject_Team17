import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAttemptHistory } from '../api/attempts';

export default function AttemptHistoryPage() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAttemptHistory()
      .then(setAttempts)
      .catch(() => setError('Could not load attempt history. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section>
      <div className="page-header">
        <h1>My Attempt History</h1>
        <Link to="/quizzes">Back to Quizzes</Link>
      </div>
      {loading && <p>Loading attempt history...</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && attempts.length === 0 && (
        <p>You have not attempted any quizzes yet.</p>
      )}
      {attempts.map((attempt) => (
        <article className="card" key={attempt.id}
          style={{ marginBottom: '1rem', padding: '1rem' }}>
          <h2>{attempt.quizTitle}</h2>
          <p>Score: {attempt.score} / {attempt.totalQuestions}</p>
          <p>Percentage: {Number(attempt.percentage).toFixed(2)}%</p>
          <p>Submitted: {attempt.submittedAt
            ? new Date(attempt.submittedAt).toLocaleString()
            : 'Date unavailable'}</p>
          <Link to={`/quizzes/attempts/${attempt.id}/result`}>
            View Detailed Results
          </Link>
        </article>
      ))}
    </section>
  );
}
