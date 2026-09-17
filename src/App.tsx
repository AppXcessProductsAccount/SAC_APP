import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate, useNavigate } from "react-router-dom";
import { setSessionExpiredHandler } from "./lib/session";
import { SettingsProvider } from "./lib/settings";
import AdminLayout from "./components/AdminLayout";
import Dashboard from "./pages/Dashboard";
import SectionsList from "./pages/SectionsList";
import SectionEditor from "./pages/SectionEditor";
import UsersList from "./pages/UsersList";
import ProgramsList from "./pages/ProgramsList";
import CreateProgram from "./pages/CreateProgram";
import ProgramDetails from "./pages/ProgramDetails";
import EditProgram from "./pages/EditProgram";
import CMSPages from "./pages/CMSPages";
import ContactSubmissions from "./pages/ContactSubmissions";
import Login from "./pages/Login";
import MembershipsList from "./pages/MembershipsList";
import MembershipApplications from "./pages/MembershipApplications";
import CreateMembership from "./pages/CreateMembership";
import EditMembership from "./pages/EditMembership";
import ForgotPassword from "./pages/ForgotPassword";
import Settings from "./pages/Settings";
import Events from "./pages/Events";
import HomeVideos from "./pages/HomeVideos";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = localStorage.getItem("user");
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

/**
 * Lets the API layer end the session from outside React.
 *
 * When a refresh fails there is nothing left to show but the login screen, so this
 * routes there instead of leaving a half-loaded page behind a "Failed to load" error.
 */
const SessionWatcher = () => {
  const navigate = useNavigate();

  useEffect(() => {
    setSessionExpiredHandler(() => navigate("/login?expired=1", { replace: true }));
    return () => setSessionExpiredHandler(null);
  }, [navigate]);

  return null;
};

function App() {
  return (
    <Router>
      <SessionWatcher />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        
        <Route element={
          <ProtectedRoute>
            {/* Inside the guard: settings are fetched with the admin token, so
                mounting this around the login screen would fire a doomed request. */}
            <SettingsProvider>
              <AdminLayout>
                <Outlet />
              </AdminLayout>
            </SettingsProvider>
          </ProtectedRoute>
        }>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sections" element={<SectionsList />} />
          <Route path="/sections/new" element={<SectionEditor />} />
          <Route path="/sections/edit/:page_id/:section_id" element={<SectionEditor />} />
          <Route path="/cms/pages" element={<CMSPages />} />
          <Route path="/enquiries" element={<ContactSubmissions />} />
          
          <Route path="/users" element={<UsersList />} />
          <Route path="/programs" element={<ProgramsList />} />
          <Route path="/programs/new" element={<CreateProgram />} />
          <Route path="/programs/edit/:id" element={<EditProgram />} />
          <Route path="/programs/:program_id" element={<ProgramDetails />} />

          <Route path="/memberships" element={<MembershipsList />} />
          <Route path="/memberships/new" element={<CreateMembership />} />
          <Route path="/memberships/edit/:id" element={<EditMembership />} />
          <Route path="/memberships/applications" element={<MembershipApplications />} />

          <Route path="/events" element={<Events />} />
          <Route path="/home-videos" element={<HomeVideos />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Unknown path: send it to the dashboard, which the guard above bounces
            to /login when there is no session. Without this the shell renders blank. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router> 
  );
}

export default App;
