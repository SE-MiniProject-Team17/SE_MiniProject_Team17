import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../roles';

/**
 * Same navigation, logout and help on every screen (NFR-QUAL-01).
 * Shows only the links the user's role may use (SAD 4.6).
 * Add your module's link to NAV_LINKS with the roles allowed to see it.
 * On small screens the links fold into a menu button (NFR-QUAL-04).
 */
const NAV_LINKS = [
  { to: '/materials', label: 'Materials', roles: [ROLES.STUDENT, ROLES.FACULTY] },
  { to: '/questions', label: 'Question Bank', roles: [ROLES.FACULTY] },
  { to: '/quizzes', label: 'Quizzes', roles: [ROLES.STUDENT, ROLES.FACULTY] },
  { to: '/performance', label: 'Performance', roles: [ROLES.STUDENT] },
  { to: '/groups', label: 'Study Groups', roles: [ROLES.STUDENT, ROLES.FACULTY, ROLES.ADMIN] },
  { to: '/profile', label: 'Profile', roles: [ROLES.STUDENT, ROLES.FACULTY, ROLES.ADMIN] },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const links = user ? NAV_LINKS.filter((l) => l.roles.includes(user.role)) : [];

  // Close the mobile menu after navigating.
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="brand" aria-label="Study & Quiz home">
          <span className="brand-mark" aria-hidden="true">SQ</span>
          <span>Study &amp; Quiz</span>
        </NavLink>

        <button
          type="button"
          className="nav-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>

        <nav id="main-nav" aria-label="Main" className={open ? 'open' : undefined}>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to}>{l.label}</NavLink>
          ))}
          <NavLink to="/help">Help</NavLink>
          {user ? (
            <span className="nav-user">
              <span className="role-chip">{user.role}</span>
              <button type="button" className="link-button" onClick={logout}>Log out</button>
            </span>
          ) : (
            <NavLink to="/login">Log in</NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
