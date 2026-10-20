import { Link, useLocation } from 'react-router-dom';

/**
 * Question Bank home (Faculty only).
 * #14 adds the question list with search and filters here.
 */
export default function QuestionBankPage() {
  const location = useLocation();
  const message = location.state?.message;

  return (
    <section>
      <div className="page-header">
        <h1>Question Bank</h1>
        <Link className="button" to="/questions/new">Add question</Link>
      </div>
      {message && <p className="success" role="status">{message}</p>}
      <p className="muted">Search and filters are coming in #14.</p>
    </section>
  );
}
