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
import QuestionFormPage from './pages/QuestionFormPage';
import QuizzesPage from './pages/QuizzesPage';
import QuizListPage from './pages/QuizListPage';
import QuizAttemptPage from './pages/QuizAttemptPage';
import { useAuth } from './context/AuthContext';
import QuizFormPage from './pages/QuizFormPage';
import AttemptResultPage from './pages/AttemptResultPage';
import AttemptHistoryPage from './pages/AttemptHistoryPage';

function RoleQuizzesPage() {
  const { user } = useAuth();
  return user?.role === ROLES.STUDENT ? <QuizListPage /> : <QuizzesPage />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/register"
            element={<PlaceholderPage title="Register" issues="#4" />}
          />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/forbidden" element={<ForbiddenPage />} />

          <Route element={<ProtectedRoute />}>
            <Route
              path="/profile"
              element={<PlaceholderPage title="My Profile" issues="#6" />}
            />
            <Route
              path="/groups/*"
              element={<PlaceholderPage title="Study Groups" issues="#25–#27" />}
            />
          </Route>

          <Route element={<ProtectedRoute roles={[ROLES.STUDENT, ROLES.FACULTY]} />}>
  <Route path="/quizzes" element={<RoleQuizzesPage />} />
            <Route
              path="/materials/*"
              element={<PlaceholderPage title="Study Materials" issues="#7–#12" />}
            />
            <Route
              path="/performance/*"
              element={<PlaceholderPage title="Performance" issues="#22–#24" />}
            />
            <Route
              path="/quizzes/attempts/:attemptId/result"
              element={<AttemptResultPage />}
            />
          </Route>

          <Route element={<ProtectedRoute roles={[ROLES.STUDENT]} />}>
            <Route path="/quizzes/:quizId/attempt" element={<QuizAttemptPage />} />
            <Route path="/attempt-history" element={<AttemptHistoryPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={[ROLES.FACULTY]} />}>
            <Route path="/quizzes/*" element={<PlaceholderPage title="Quizzes" issues="#17–#19" />} />
            <Route path="/questions" element={<QuestionBankPage />} />
            <Route path="/questions/new" element={<QuestionFormPage key="new" />} />
            <Route path="/questions/:id/edit" element={<QuestionFormPage key="edit" />} />
            <Route path="/quizzes/new" element={<QuizFormPage key="new" />} />
            <Route path="/quizzes/:id/edit" element={<QuizFormPage key="edit" />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div>
          <span>Study &amp; Quiz · Team 17 SE Mini Project</span>
          <span>Need help? See the Help page.</span>
        </div>
      </footer>
    </>
  );
}
