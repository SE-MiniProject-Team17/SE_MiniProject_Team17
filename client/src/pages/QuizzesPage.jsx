import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiError } from '../api/client';
import { deleteQuiz, listMyQuizzes, publishQuiz } from '../api/quizzes';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../roles';
import { formatDateTime } from '../utils/dates';

/**
 * /quizzes
 * Faculty (#16): "My quizzes" – create, edit Drafts, publish.
 * Students: the list of available quizzes is #17 (VedhV).
 */
export default function QuizzesPage() {
  const { user } = useAuth();
  if (user?.role !== ROLES.FACULTY) {
    return (
      <section>
        <h1>Quizzes</h1>
        <p className="muted">Available quizzes are coming soon (#17).</p>
      </section>
    );
  }
  return <MyQuizzes />;
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

  useEffect(() => {
    load();
  }, [load]);

  async function confirmPublish(id) {
    setPublishing(true);
    setError('');
    setNotice('');
    try {
      await publishQuiz(id);
      setNotice('Quiz published. Students can now see it.');
      await load();
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setConfirmId(null);
      setPublishing(false);
    }
  }

  async function confirmDelete(id) {
    setDeleting(true);
    setError('');
    setNotice('');
    try {
      await deleteQuiz(id);
      setNotice('Quiz deleted.');
      await load();
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setDeleteId(null);
      setDeleting(false);
    }
  }

  return (
    <section>
      <div className="page-header">
        <h1>My quizzes</h1>
        <Link className="button" to="/quizzes/new">Create quiz</Link>
      </div>
      {notice && <p className="success" role="status">{notice}</p>}
      {error && <p className="alert" role="alert">{error}</p>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : quizzes.length === 0 ? (
        <p className="empty" role="status">You have not created any quizzes yet</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Status</th>
                <th scope="col">Questions</th>
                <th scope="col">Time limit</th>
                <th scope="col">Available</th>
                <th scope="col"><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map((q) => (
                <tr key={q.id}>
                  <td>{q.title}</td>
                  <td>
                    <span className={`badge ${q.status === 'Published' ? 'badge-easy' : 'badge-draft'}`}>{q.status}</span>
                  </td>
                  <td>{q.questionCount}</td>
                  <td>{q.timeLimitMinutes} min</td>
                  <td className="small">
                    {formatDateTime(q.availableFrom)} – {formatDateTime(q.availableUntil)}
                  </td>
                  <td className="actions">
                    {deleteId === q.id ? (
                      <span className="confirm" role="group" aria-label="Confirm deleting">
                        Delete this quiz? This cannot be undone.
                        <button type="button" className="danger" disabled={deleting} onClick={() => confirmDelete(q.id)}>
                          {deleting ? 'Deleting…' : 'Delete'}
                        </button>
                        <button type="button" className="secondary" disabled={deleting} onClick={() => setDeleteId(null)}>
                          Cancel
                        </button>
                      </span>
                    ) : confirmId === q.id ? (
                      <span className="confirm" role="group" aria-label="Confirm publishing">
                        Publish? Questions will be locked.
                        <button type="button" disabled={publishing} onClick={() => confirmPublish(q.id)}>
                          {publishing ? 'Publishing…' : 'Publish'}
                        </button>
                        <button type="button" className="secondary" disabled={publishing} onClick={() => setConfirmId(null)}>
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <>
                        {q.status === 'Draft' ? (
                          <>
                            <Link to={`/quizzes/${q.id}/edit`}>Edit</Link>
                            <button type="button" className="link-button" onClick={() => setConfirmId(q.id)}>
                              Publish
                            </button>
                          </>
                        ) : (
                          <span className="muted small">Published {formatDateTime(q.publishedAt)}</span>
                        )}
                        <button type="button" className="link-button danger-link" onClick={() => setDeleteId(q.id)}>
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
