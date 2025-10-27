import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

// Auth services
export const auth = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    changePassword: (passwords) => api.put('/auth/password', passwords)
};

// Profile services
export const profile = {
    get: () => api.get('/profile'),
    update: (data) => api.put('/profile', data),
    updateAvatar: (avatarData) => api.put('/profile/avatar', avatarData),
    updateClassmates: (data) => api.put('/profile/classmates', data),
    getClassmates: () => api.get('/profile/classmates')
};

// Academic services
export const academic = {
    // Student-specific operations (for admin)
    getStudents: () => api.get('/academic/students'),
    getStudentGrades: (studentId) => api.get(`/academic/students/${studentId}/grades`),
    addSubjectForStudent: (studentId, data) => api.post(`/academic/students/${studentId}/subjects`, data),
    updateStudentGrades: (studentId, subjectName, grades) => 
        api.put(`/academic/students/${studentId}/subjects/${subjectName}/grades`, grades),
    deleteStudentSubject: (studentId, subjectName) => 
        api.delete(`/academic/students/${studentId}/subjects/${subjectName}`)
};

// Notebook services
export const notebook = {
    get: () => api.get('/notebook'),
    addSheet: (data) => api.post('/notebook/sheets', data),
    updateSheet: (sheetId, data) => api.put(`/notebook/sheets/${sheetId}`, data),
    deleteSheet: (sheetId) => api.delete(`/notebook/sheets/${sheetId}`)
};

// Timeline services
export const timeline = {
    getPosts: () => api.get('/timeline'),
    createPost: (data) => api.post('/timeline', data),
    addReaction: (postId, data) => api.post(`/timeline/${postId}/react`, data),
    removeReaction: (postId) => api.delete(`/timeline/${postId}/react`),
    deletePost: (postId) => api.delete(`/timeline/${postId}`)
};

// Organization services
export const organization = {
    getAll: () => api.get('/organization'),
    addMember: (data) => api.post('/organization', data),
    updateMember: (memberId, data) => api.put(`/organization/${memberId}`, data),
    deleteMember: (memberId) => api.delete(`/organization/${memberId}`),
    getDepartmentMembers: (department) => api.get(`/organization/department/${department}`)
};

export default api;