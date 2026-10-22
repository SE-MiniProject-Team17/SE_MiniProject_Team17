import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiError } from '../api/client';
import { deleteQuestion, listTopics, searchQuestions } from '../api/questions';
import { useAuth } from '../context/AuthContext';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const PAGE_SIZE = 20;

/**
 * Question Bank (Faculty only).
 * #13 – "Add question" button and success message.
 * #14 – keyword search, topic and difficulty filters, results list (REQ-QB-04).
 * #15 – the owner can edit or remove their own questions; removal asks for confirmation (REQ-QB-06).
 */
export default function QuestionBankPage() {
  const location = useLocation();
  const { user } = useAuth();

  const [keyword, setKeyword] = useState('');
  const [filters, setFilters] = useState({ q: '', topic: '', difficulty: '' });
  const [page, setPage] = useState(1);
  const [topics, setTopics] = useState([]);
  const [result, setResult] = useState({ questions: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.message || '');
  const [confirmId, setConfirmId] = useState(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setResult(await searchQuestions({ ...filters, page, limit: PAGE_SIZE }));
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    listTopics().then(setTopics).catch(() => setTopics([]));
  }, []);

  const applyFilter = (changes) => {
    setPage(1);
    setFilters((f) => ({ ...f, ...changes }));
  };

  function handleSearch(e) {
    e.preventDefault();
    applyFilter({ q: keyword.trim() });
  }

  function clearAll() {
    setKeyword('');
    setPage(1);
    setFilters({ q: '', topic: '', difficulty: '' });
  }

  async function confirmRemove(id) {
    setRemoving(true);
    setError('');
    try {
      await deleteQuestion(id);
      setConfirmId(null);
      setNotice('Question removed.');
      await load();
      listTopics().then(setTopics).catch(() => {});
    } catch (err) {
      setConfirmId(null);
      setError(apiError(err).message);
    } finally {
      setRemoving(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const hasFilters = filters.q || filters.topic || filters.difficulty;
  const ownerLabel = (owner) => (owner.id === user?.id ? 'You' : owner.name || 'Another Faculty member');

  return (
    <section>
      <div className="page-header">
        <h1>Question Bank</h1>
        <Link className="button" to="/questions/new">Add question</Link>
      </div>
      {notice && <p className="success" role="status">{notice}</p>}

      <form className="search-bar" onSubmit={handleSearch} role="search">
        <label htmlFor="q" className="visually-hidden">Keyword</label>
        <input
          id="q"
          type="search"
          placeholder="Search question text…"
          value={keyword}
          maxLength={100}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      <div className="filters">
        <label htmlFor="topic">
          Topic
          <select id="topic" value={filters.topic} onChange={(e) => applyFilter({ topic: e.target.value })}>
            <option value="">All topics</option>
            {topics.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label htmlFor="difficulty">
          Difficulty
          <select id="difficulty" value={filters.difficulty} onChange={(e) => applyFilter({ difficulty: e.target.value })}>
            <option value="">All</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
        {hasFilters && (
          <button type="button" className="link-button" onClick={clearAll}>Clear search</button>
        )}
      </div>

      {error && <p className="alert" role="alert">{error}</p>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : result.questions.length === 0 ? (
        <p className="empty" role="status">No questions found</p>
      ) : (
        <>
          <p className="muted small" role="status">
            {result.total} question{result.total === 1 ? '' : 's'}
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Question</th>
                  <th scope="col">Topic</th>
                  <th scope="col">Difficulty</th>
                  <th scope="col">Owner</th>
                  <th scope="col"><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {result.questions.map((q) => (
                  <tr key={q.id}>
                    <td className="question-text">{q.text}</td>
                    <td>{q.topic}</td>
                    <td><span className={`badge badge-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span></td>
                    <td>{ownerLabel(q.owner)}</td>
                    <td className="actions">
                      {q.owner.id === user?.id &&
                        (confirmId === q.id ? (
                          <span className="confirm" role="group" aria-label="Confirm removal">
                            Remove this question?
                            <button type="button" className="danger" disabled={removing} onClick={() => confirmRemove(q.id)}>
                              {removing ? 'Removing…' : 'Remove'}
                            </button>
                            <button type="button" className="secondary" disabled={removing} onClick={() => setConfirmId(null)}>
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <>
                            <Link to={`/questions/${q.id}/edit`}>Edit</Link>
                            <button type="button" className="link-button danger-link" onClick={() => setConfirmId(q.id)}>
                              Remove
                            </button>
                          </>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <nav className="pager" aria-label="Pages">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <span>Page {page} of {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
