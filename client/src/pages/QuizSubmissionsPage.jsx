import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiError } from '../api/client';
import { getQuizSubmissions } from '../api/quizzes';
import { formatDateTime } from '../utils/dates';

/** /quizzes/:id/submissions – the quiz owner's list of submissions (#50, REQ-QZ-16, UC-QZ-07). */
export default function QuizSubmissionsPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getQuizSubmissions(id)
      .then((result) => active && setData(result))
      .catch((err) => active && setError(apiError(err).message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <p className="muted">Loading…</p>;

  if (error) {
    return (
      <section>
        <p className="alert" role="alert">{error}</p>
        <p><Link to="/quizzes">← Back to My quizzes</Link></p>
      </section>
    );
  }

  const { quiz, submissions } = data;
  return (
    <section>
      <p><Link to="/quizzes">← Back to My quizzes</Link></p>
      <div className="page-header">
        <h1>Submissions: {quiz.title}</h1>
      </div>

      {submissions.length === 0 ? (
        <p className="empty" role="status">No submissions yet</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Student</th>
                <th scope="col">Score</th>
                <th scope="col">Percentage</th>
                <th scope="col">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id}>
                  <td>{s.studentName}</td>
                  <td>{s.score} / {s.totalQuestions}</td>
                  <td>{s.percentage}%</td>
                  <td className="small">{formatDateTime(s.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
