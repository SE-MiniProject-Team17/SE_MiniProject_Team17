
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiError } from '../api/client';
import {
  getMyPerformance,
  getMyTopicPerformance,
} from '../api/performance';

function formatSubmissionDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString();
}

export default function PerformancePage() {
  const [performance, setPerformance] = useState(null);
  const [topicPerformance, setTopicPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadPerformance() {
      try {
        const [personalData, topicData] = await Promise.all([
          getMyPerformance(),
          getMyTopicPerformance(),
        ]);

        if (active) {
          setPerformance(personalData);
          setTopicPerformance(topicData);
        }
      } catch (err) {
        if (active) setError(apiError(err).message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPerformance();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <p className="muted">Loading your performance...</p>;
  }

  if (error) {
    return (
      <section>
        <h1>My Performance</h1>
        <p className="alert" role="alert">{error}</p>
      </section>
    );
  }

  const { summary, attempts } = performance;
  const topics = topicPerformance?.topics || [];

  return (
    <section>
      <div className="page-header">
        <h1>My Performance</h1>
      </div>

      {attempts.length === 0 ? (
        <p className="empty" role="status">
          You have no completed quiz attempts yet. Complete a quiz to see
          your performance here.
        </p>
      ) : (
        <>
          <div className="performance-summary">
            <h2>Performance summary</h2>
            <p>
              Completed attempts: <strong>{summary.totalAttempts}</strong>
            </p>
            <p>
              Average percentage:{' '}
              <strong>{summary.averagePercentage.toFixed(2)}%</strong>
            </p>
            <p>
              Total score: <strong>{summary.totalScore}</strong> /{' '}
              {summary.totalQuestions}
            </p>
          </div>

          <h2>Completed attempts</h2>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Quiz</th>
                  <th scope="col">Score</th>
                  <th scope="col">Percentage</th>
                  <th scope="col">Submitted</th>
                  <th scope="col">Results</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td>{attempt.quizTitle}</td>
                    <td>
                      {attempt.score} / {attempt.totalQuestions}
                    </td>
                    <td>{attempt.percentage.toFixed(2)}%</td>
                    <td>{formatSubmissionDate(attempt.submittedAt)}</td>
                    <td>
                      <Link to={`/quizzes/attempts/${attempt.id}`}>
                        View results
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2>Topic-level performance</h2>

      {topics.length === 0 ? (
        <p className="empty" role="status">
          No topic-level performance data is available yet.
          Complete a quiz with recorded answers to see your results by topic.
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Topic</th>
                <th scope="col">Answered questions</th>
                <th scope="col">Correct answers</th>
                <th scope="col">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((topic) => (
                <tr key={topic.topic}>
                  <td>{topic.topic}</td>
                  <td>{topic.totalQuestions}</td>
                  <td>{topic.correctAnswers}</td>
                  <td>{topic.accuracy.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
