import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../roles';

const Icon = ({ d }) => (
  <span className="feature-icon" aria-hidden="true">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  </span>
);

const ICONS = {
  materials: 'M4 19.5V5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2.5zM8 7h6',
  questions: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01',
  quizzes: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9',
  performance: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  groups: 'M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM21 21v-2a4 4 0 0 0-3-3.9',
};

/** Shortcuts shown to a logged-in user, filtered by role. */
const SHORTCUTS = [
  { to: '/questions', title: 'Question Bank', text: 'Add, search and edit your questions.', icon: 'questions', roles: [ROLES.FACULTY] },
  { to: '/quizzes', title: 'Quizzes', text: 'Create, publish and take timed quizzes.', icon: 'quizzes', roles: [ROLES.FACULTY, ROLES.STUDENT] },
  { to: '/materials', title: 'Study Materials', text: 'Upload and share notes and slides.', icon: 'materials', roles: [ROLES.FACULTY, ROLES.STUDENT] },
  { to: '/faculty/performance', title: 'Class Performance', text: 'Review quiz and class performance.', icon: 'performance', roles: [ROLES.FACULTY] },
  { to: '/performance', title: 'Performance', text: 'See scores and topic-wise progress.', icon: 'performance', roles: [ROLES.STUDENT] },
  { to: '/groups', title: 'Study Groups', text: 'Learn together with classmates.', icon: 'groups', roles: [ROLES.FACULTY, ROLES.STUDENT, ROLES.ADMIN] },
];

const FEATURES = [
  { title: 'Share materials', text: 'Upload notes and slides and share them with classmates.', icon: 'materials' },
  { title: 'Practise with quizzes', text: 'Timed quizzes, graded instantly with explanations.', icon: 'quizzes' },
  { title: 'Track your progress', text: 'See scores and the topics that need more work.', icon: 'performance' },
];

export default function HomePage() {
  const { user } = useAuth();

  if (user) {
    const shortcuts = SHORTCUTS.filter((s) => s.roles.includes(user.role));
    return (
      <section>
        <div className="page-header">
          <div>
            <h1>Welcome back</h1>
            <p className="muted">You are logged in as {user.role}. Where would you like to start?</p>
          </div>
        </div>
        <div className="feature-grid">
          {shortcuts.map((s) => (
            <Link key={s.to} to={s.to} className="feature">
              <Icon d={ICONS[s.icon]} />
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="hero">
        <span className="hero-eyebrow">Collaborative Study Material &amp; Quiz Platform</span>
        <h1>
          Study together, <span className="accent">practise smarter</span>
        </h1>
        <p>Share study material, take auto-graded quizzes and track your progress, all in one place.</p>
        <div className="hero-actions">
          <Link to="/login" className="button">Log in</Link>
          <Link to="/help" className="button secondary">How it works</Link>
        </div>
      </div>
      <div className="feature-grid">
        {FEATURES.map((f) => (
          <div key={f.title} className="feature">
            <Icon d={ICONS[f.icon]} />
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
