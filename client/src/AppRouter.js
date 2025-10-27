import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layouts/MainLayout';
import { useAuth } from './contexts/AuthContext';

// Import pages
import Login from './pages/Login.js';
import Register from './pages/Register.js';
import Grades from './pages/Grades.js';
import Notebook from './pages/Notebook.js';
import Timeline from './pages/Timeline.js';
import Organization from './pages/Organization.js';
import Profile from './pages/Profile.js';
import DataStore from './pages/DataStore.js';

const PrivateRoute = ({ children, requireAdmin = false, requireStudent = false}) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" />;
    }

    if (requireAdmin && user.role !== 'admin') {
        console.log('Redirecting to /grades because user is not admin');
        return <Navigate to="/grades" />;
    }

    if (requireStudent && user.role !== 'student') {
        console.log('Redirecting to /datastore because user is not student');
        return <Navigate to="/datastore" />;
    }

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
                                <Navigate to="/timeline" />
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
            </Routes>
        </Router>
    );
};

export default AppRouter;