import { Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { ROLES } from './roles';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import HelpPage from './pages/HelpPage';
import ForbiddenPage from './pages/ForbiddenPage';
import NotFoundPage from './pages/NotFoundPage';
import PlaceholderPage from './pages/PlaceholderPage';
import QuestionBankPage from './pages/QuestionBankPage';
import AddQuestionPage from './pages/AddQuestionPage';

/*
 * All routes in one place. When you build your module, replace its
 * PlaceholderPage with your real page component (keep the same path and roles).
 */
export default function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<PlaceholderPage title="Register" issues="#4" />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/forbidden" element={<ForbiddenPage />} />

          {/* Any logged-in user */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<PlaceholderPage title="My Profile" issues="#6" />} />
            <Route path="/groups/*" element={<PlaceholderPage title="Study Groups" issues="#25–#27" />} />
          </Route>

          {/* Students and Faculty */}
          <Route element={<ProtectedRoute roles={[ROLES.STUDENT, ROLES.FACULTY]} />}>
            <Route path="/materials/*" element={<PlaceholderPage title="Study Materials" issues="#7–#12" />} />
            <Route path="/quizzes/*" element={<PlaceholderPage title="Quizzes" issues="#16–#20" />} />
            <Route path="/performance/*" element={<PlaceholderPage title="Performance" issues="#22–#24" />} />
          </Route>

          {/* Faculty only */}
          <Route element={<ProtectedRoute roles={[ROLES.FACULTY]} />}>
            <Route path="/questions" element={<QuestionBankPage />} />
            <Route path="/questions/new" element={<AddQuestionPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}
