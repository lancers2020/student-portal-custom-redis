import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import MainLayout from './components/layouts/MainLayout';
import { useAuth } from './contexts/AuthContext';

// Import pages (assuming these imports are correct)
import Login from './pages/Login.js';
import Register from './pages/Register.js';
import Grades from './pages/Grades.js';
import Notebook from './pages/Notebook.js';
import Timeline from './pages/Timeline.js';
import Organization from './pages/Organization.js';
import Profile from './pages/Profile.js';
import DataStore from './pages/DataStore.js';
import Class from './pages/Class.js';

/**
 * Corrected PrivateRoute component to prevent the infinite redirect loop.
 * Logic is consolidated in useEffect, and component only renders children
 * once authorization is explicitly confirmed.
 */
const PrivateRoute = ({ children, requireAdmin = false, requireStudent = false, requireTeacher = false }) => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    // New state: assume unauthorized until check is complete
    const [isAuthorized, setIsAuthorized] = useState(false); 

    useEffect(() => {
        let isMounted = true;
        setIsAuthorized(false); // Reset authorization status on dependency change

        // Skip logic if still loading auth state
        if (loading || !isMounted) return;

        // --- 1. Authentication Check ---
        if (!user) {
            console.log('User not authenticated, redirecting to login');
            // Small timeout to help with race conditions in React Router
            setTimeout(() => {
                if (isMounted) navigate('/login', { replace: true });
            }, 50);
            return; 
        }

        // --- 2. Role-based Checks ---
        let isRoleAuthorized = true;
        let redirectPath = null;

        if (requireAdmin && user.role !== 'admin') {
            isRoleAuthorized = false;
            redirectPath = '/grades'; // Fallback for unauthorized roles
        } else if (requireStudent && user.role !== 'student') {
            isRoleAuthorized = false;
            redirectPath = '/datastore'; // Fallback for unauthorized roles
        } else if (requireTeacher && user.role !== 'teacher') {
            isRoleAuthorized = false;
            // Admins go to DataStore, everyone else (e.g. students) go to Grades
            redirectPath = user.role === 'admin' ? '/datastore' : '/grades';
        }

        if (!isRoleAuthorized) {
            console.log(`Access denied for role: ${user.role}. Redirecting to ${redirectPath}`);
            setTimeout(() => {
                if (isMounted) navigate(redirectPath, { replace: true });
            }, 50);
        } else {
            // --- 3. Success! Authorization Complete ---
            setIsAuthorized(true);
        }

        return () => {
            isMounted = false;
        };
    }, [user, loading, requireAdmin, requireStudent, requireTeacher, navigate]);

    // --- RENDER LOGIC ---

    if (error) {
        return (
            <div style={{ 
                padding: '20px', 
                margin: '20px', 
                backgroundColor: '#fff3f3', 
                border: '1px solid #ff0000',
                borderRadius: '4px'
            }}>
                <h3>Error</h3>
                <p>{error}</p>
                <button onClick={() => window.location.reload()}>
                    Refresh Page
                </button>
            </div>
        );
    }

    // Show loading while auth is pending OR while we are running a redirect 
    // (since isAuthorized will be false)
    // if (loading || !isAuthorized) {
    if (loading || !isAuthorized) {
        console.log(':::requireAdmin:', requireAdmin, 'requireStudent:', requireStudent, 'requireTeacher:', requireTeacher, 'loading:', loading, 'isAuthorized:', isAuthorized);
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh'
            }}>
                <div>
                    <h2>Loading...</h2>
                    <p>Please wait while we verify your access...</p>
                </div>
            </div>
        );
    }

    // Only render children when explicitly authorized
    return children;
};

const AppRouter = () => {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                    path="/"
                    element={
                        <PrivateRoute>
                            <MainLayout>
                                {/* This Navigate component handles the default root route redirect */}
                                <Navigate to="/timeline" replace /> 
                            </MainLayout>
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/grades"
                    element={
                        <PrivateRoute requireStudent={true}>
                            <MainLayout>
                                <Grades />
                            </MainLayout>
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/notebook"
                    element={
                        <PrivateRoute>
                            <MainLayout>
                                <Notebook />
                            </MainLayout>
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/timeline"
                    element={
                        <PrivateRoute>
                            <MainLayout>
                                <Timeline />
                            </MainLayout>
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/organization"
                    element={
                        <PrivateRoute>
                            <MainLayout>
                                <Organization />
                            </MainLayout>
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <PrivateRoute>
                            <MainLayout>
                                <Profile />
                            </MainLayout>
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/datastore"
                    element={
                        <PrivateRoute requireAdmin={true}>
                            <MainLayout>
                                <DataStore />
                            </MainLayout>
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/class"
                    element={
                        <PrivateRoute requireTeacher={true}>
                            <MainLayout>
                                <Class />
                            </MainLayout>
                        </PrivateRoute>
                    }
                />
            </Routes>
        </Router>
    );
};

export default AppRouter;