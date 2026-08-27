import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StudentList from './pages/StudentList';
import StudentDetail from './pages/StudentDetail';
import AttendanceMark from './pages/AttendanceMark';
import GradeManagement from './pages/GradeManagement';
import ClassAnalytics from './pages/ClassAnalytics';
import QRAttendance from './pages/QRAttendance';
import NotificationCenter from './pages/NotificationCenter';
import Profile from './pages/Profile';
import Layout from './components/Layout';

const PrivateRoute = ({ children }) => {
    const { isAuthenticated } = useSelector((state) => state.auth);
    return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                    path="/"
                    element={
                        <PrivateRoute>
                            <Layout />
                        </PrivateRoute>
                    }
                >
                    <Route index element={<Dashboard />} />
                    <Route path="students" element={<StudentList />} />
                    <Route path="students/:id" element={<StudentDetail />} />
                    <Route path="grades" element={<GradeManagement />} />
                    <Route path="analytics/:classSectionId" element={<ClassAnalytics />} />
                    <Route path="attendance/mark" element={<AttendanceMark />} />
                    <Route path="attendance/qr" element={<QRAttendance />} />
                    <Route path="notifications" element={<NotificationCenter />} />
                    <Route path="profile" element={<Profile />} />
                </Route>
            </Routes>
        </Router>
    );
}

export default App;
