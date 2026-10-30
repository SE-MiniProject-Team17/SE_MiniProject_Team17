import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiError } from '../api/client';
import { getFacultyPerformanceDashboard } from '../api/performance';

function percentage(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

export default function FacultyPerformancePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getFacultyPerformanceDashboard()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(apiError(err).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p className="muted">Loading faculty dashboard…</p>;

  if (error) {
    return (
      <section>
        <h1>Faculty Performance Dashboard</h1>
        <p className="alert" role="alert">{error}</p>
      </section>
    );
  }

  const { summary, quizzes, students } = data;

  return (
    <section>
      <div className="page-header">
        <h1>Faculty Performance Dashboard</h1>
      </div>

      <p className="muted">
        An overview of submitted attempts for quizzes you own.
      </p>

      <div className="performance-summary">
        <h2>Class overview</h2>
        <p>Quizzes created: <strong>{summary.totalQuizzes}</strong></p>
        <p>
          Quizzes with submissions:{' '}
          <strong>{summary.quizzesWithSubmissions}</strong>
        </p>
        <p>Completed submissions: <strong>{summary.totalSubmissions}</strong></p>
        <p>Students represented: <strong>{summary.uniqueStudents}</strong></p>
        <p>Average percentage: <strong>{percentage(summary.averagePercentage)}</strong></p>
      </div>

      <h2>Quiz performance</h2>
      {quizzes.length === 0 ? (
        <p className="empty" role="status">
          You have not created any quizzes yet.
          <Link to="/quizzes/new"> Create a quiz</Link> to get started.
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Quiz</th>
                <th scope="col">Status</th>
                <th scope="col">Submissions</th>
                <th scope="col">Average percentage</th>
                <th scope="col">Details</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map((quiz) => (
                <tr key={quiz.id}>
                  <td>{quiz.title}</td>
                  <td>{quiz.status}</td>
                  <td>{quiz.submissionCount}</td>
                  <td>
                    {quiz.submissionCount ? percentage(quiz.averagePercentage) : '—'}
                  </td>
                  <td>
                    {quiz.status === 'Published' && (
                      <Link to={`/quizzes/${quiz.id}/submissions`}>
                        View submissions
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Student performance</h2>
      {students.length === 0 ? (
        <p className="empty" role="status">
          No completed submissions are available yet.
          Student performance will appear here after a quiz is submitted.
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Student</th>
                <th scope="col">Completed attempts</th>
                <th scope="col">Average percentage</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr key={`${student.studentName}-${index}`}>
                  <td>{student.studentName}</td>
                  <td>{student.completedAttempts}</td>
                  <td>{percentage(student.averagePercentage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
