import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiError } from '../api/client';
import {
  deleteQuiz,
  listMyQuizzes,
  publishQuiz,
  listAvailableQuizzes,
  startQuizAttempt,
} from '../api/quizzes';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../roles';
import { formatDateTime } from '../utils/dates';

export default function QuizzesPage() {
  const { user } = useAuth();
  if (user?.role !== ROLES.FACULTY) return <StudentQuizzes />;
  return <MyQuizzes />;
}

function StudentQuizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [startingId, setStartingId] = useState('');

  const load = useCallback(async ({ clearError = true } = {}) => {
    setLoading(true);
    if (clearError) setError('');
    try {
      setQuizzes(await listAvailableQuizzes());
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function startQuiz(quiz) {
    setStartingId(quiz.id);
    setError('');
    setNotice('');
    try {
      const attempt = await startQuizAttempt(quiz.id);
      setNotice(`Attempt started for "${attempt.title}". Your attempt ID is ${attempt.id}.`);
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setStartingId('');
      await load({ clearError: false });
    }
  }

  return (
    <section>
      <div className="page-header"><h1>Available quizzes</h1></div>
      {notice && <p className="success" role="status">{notice}</p>}
      {error && <p className="alert" role="alert">{error}</p>}
      {loading ? <p className="muted">Loading quizzes...</p> :
        quizzes.length === 0 ? <p className="empty">No available or upcoming quizzes.</p> :
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Title</th><th>Description</th><th>Questions</th>
              <th>Time limit</th><th>Availability</th><th>Window</th><th>Action</th>
            </tr></thead>
            <tbody>
              {quizzes.map((q) => {
                const upcoming = q.availability === 'Upcoming';
                return <tr key={q.id}>
                  <td>{q.title}</td>
                  <td>{q.description || '—'}</td>
                  <td>{q.questionCount}</td>
                  <td>{q.timeLimitMinutes} min</td>
                  <td>{upcoming ? 'Upcoming' : 'Open'}</td>
                  <td className="small">{formatDateTime(q.availableFrom)} – {formatDateTime(q.availableUntil)}</td>
                  <td>
                    <button type="button" disabled={upcoming || startingId === q.id}
                      onClick={() => startQuiz(q)}>
                      {startingId === q.id ? 'Starting...' : upcoming ? 'Not open yet' : 'Start quiz'}
                    </button>
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>}
    </section>
  );
}

function MyQuizzes() {
  const location = useLocation();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.message || '');
  const [confirmId, setConfirmId] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setQuizzes(await listMyQuizzes());
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function confirmPublish(id) {
    setPublishing(true); setError(''); setNotice('');
    try { await publishQuiz(id); setNotice('Quiz published. Students can now see it.'); await load(); }
    catch (err) { setError(apiError(err).message); }
    finally { setConfirmId(null); setPublishing(false); }
  }

  async function confirmDelete(id) {
    setDeleting(true); setError(''); setNotice('');
    try { await deleteQuiz(id); setNotice('Quiz deleted.'); await load(); }
    catch (err) { setError(apiError(err).message); }
    finally { setDeleteId(null); setDeleting(false); }
  }

  return (
    <section>
      <div className="page-header"><h1>My quizzes</h1><Link className="button" to="/quizzes/new">Create quiz</Link></div>
      {notice && <p className="success" role="status">{notice}</p>}
      {error && <p className="alert" role="alert">{error}</p>}
      {loading ? <p className="muted">Loading...</p> : quizzes.length === 0 ?
        <p className="empty" role="status">You have not created any quizzes yet</p> :
        <div className="table-wrap"><table>
          <thead><tr><th>Title</th><th>Status</th><th>Questions</th><th>Time limit</th><th>Available</th><th>Actions</th></tr></thead>
          <tbody>{quizzes.map((q) => <tr key={q.id}>
            <td>{q.title}</td>
            <td><span className={`badge ${q.status === 'Published' ? 'badge-easy' : 'badge-draft'}`}>{q.status}</span></td>
            <td>{q.questionCount}</td><td>{q.timeLimitMinutes} min</td>
            <td className="small">{formatDateTime(q.availableFrom)} – {formatDateTime(q.availableUntil)}</td>
            <td className="actions">
              {deleteId === q.id ? <span className="confirm" role="group" aria-label="Confirm deleting">
                Delete this quiz? This cannot be undone.
                <button type="button" className="danger" disabled={deleting} onClick={() => confirmDelete(q.id)}>{deleting ? 'Deleting...' : 'Delete'}</button>
                <button type="button" className="secondary" disabled={deleting} onClick={() => setDeleteId(null)}>Cancel</button>
              </span> : confirmId === q.id ? <span className="confirm" role="group" aria-label="Confirm publishing">
                Publish? Questions will be locked.
                <button type="button" disabled={publishing} onClick={() => confirmPublish(q.id)}>{publishing ? 'Publishing...' : 'Publish'}</button>
                <button type="button" className="secondary" disabled={publishing} onClick={() => setConfirmId(null)}>Cancel</button>
              </span> : <>
                {q.status === 'Draft' ? <>
                  <Link to={`/quizzes/${q.id}/edit`}>Edit</Link>
                  <button type="button" className="link-button" onClick={() => setConfirmId(q.id)}>Publish</button>
                </> : <>
                  <Link to={`/quizzes/${q.id}/submissions`}>Submissions</Link>
                  <span className="muted small">Published {formatDateTime(q.publishedAt)}</span>
                </>}
                <button type="button" className="link-button danger-link" onClick={() => setDeleteId(q.id)}>Delete</button>
              </>}
            </td>
          </tr>)}</tbody>
        </table></div>}
    </section>
  );
}
