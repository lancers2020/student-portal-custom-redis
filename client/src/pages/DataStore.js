import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Divider,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    Tabs,
    Tab,
    Card,
    CardContent,
    Grid
} from '@mui/material';
import {
    Edit as EditIcon,
    School as SchoolIcon,
    Delete as DeleteIcon,
    Add as AddIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { academic } from '../services/api';

const DataStore = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedTab, setSelectedTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [openGradeDialog, setOpenGradeDialog] = useState(false);
    const [openUserDialog, setOpenUserDialog] = useState(false);
    const [dialogMode, setDialogMode] = useState('add'); // 'add' or 'edit'
    const [formData, setFormData] = useState({
        subjectName: '',
        grades: {
            firstGrading: '',
            secondGrading: '',
            thirdGrading: '',
            fourthGrading: ''
        }
    });
    const [userFormData, setUserFormData] = useState({
        email: '',
        fullName: '',
        address: '',
        age: '',
        role: '',
        password: '',
        confirmPassword: ''
    });

    useEffect(() => {
        if (user?.role === 'admin') {
            loadStudents();
        }
    }, [user]);

    const loadStudents = async () => {
        try {
            const response = await academic.getStudents();
            setStudents(response.data);
        } catch (err) {
            setError('Failed to load students');
        }
    };

    const loadStudentGrades = async (studentId) => {
        try {
            const response = await academic.getStudentGrades(studentId);
            setSelectedStudent({
                ...students.find(s => s.id === studentId),
                grades: response.data
            });
        } catch (err) {
            setError('Failed to load student grades');
        }
    };

    const handleStudentSelect = (studentId) => {
        loadStudentGrades(studentId);
    };

    const handleEditUser = (student) => {
        setUserFormData({
            email: student.email,
            fullName: student.fullName,
            address: student.address || '',
            age: student.age || '',
            role: student.role,
            password: '',
            confirmPassword: ''
        });
        setSelectedStudent(student);
        setOpenUserDialog(true);
    };

    const handleUpdateUser = async () => {
        try {
            if (!selectedStudent) return;

            if (userFormData.password && userFormData.password !== userFormData.confirmPassword) {
                setError('Passwords do not match');
                return;
            }

            setLoading(true);
            setError('');

            const updateData = {
                email: userFormData.email,
                fullName: userFormData.fullName,
                address: userFormData.address,
                age: Number(userFormData.age),
                role: userFormData.role
            };

            if (userFormData.password) {
                updateData.password = userFormData.password;
            }

            await academic.updateUser(selectedStudent.id, updateData);
            await loadStudents();
            setOpenUserDialog(false);
            setSuccess('User updated successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update user');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (userId === user.id) {
            setError('You cannot delete your own account');
            return;
        }

        if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            try {
                setLoading(true);
                setError('');
                await academic.deleteUser(userId);
                await loadStudents();
                setSuccess('User deleted successfully');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete user');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleAddSubject = async () => {
        try {
            setLoading(true);
            setError('');
            console.log(':::formData', formData);
            const addingGrades = await academic.addSubjectForStudent(selectedStudent.id, { 
                subjectName: formData.subjectName ,
                grades: formData.grades
            });
            console.log(':::addingGrades', addingGrades);
            const gettingGrades = await loadStudentGrades(selectedStudent.id);
            console.log(':::gettingGrades', gettingGrades);
            setOpenGradeDialog(false);
            setFormData({
                subjectName: '',
                grades: {
                    firstGrading: '',
                    secondGrading: '',
                    thirdGrading: '',
                    fourthGrading: ''
                }
            });
            setSuccess('Subject added successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add subject');
        } finally {
            setLoading(false);
        }
    };

    // Updated to accept the subject data from the form
    const handleUpdateGrades = async (subjectData) => {
        try {
            setLoading(true);
            setError('');
            await academic.updateStudentGrades(
                selectedStudent.id, 
                subjectData.subjectName, // Use the subjectName from the data
                subjectData.grades
            );
            await loadStudentGrades(selectedStudent.id);
            setOpenGradeDialog(false);
            setSuccess('Grades updated successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update grades');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSubject = async (subjectName) => {
        if (window.confirm('Are you sure you want to delete this subject?')) {
            try {
                setLoading(true);
                setError('');
                await academic.deleteStudentSubject(selectedStudent.id, subjectName);
                await loadStudentGrades(selectedStudent.id);
                setSuccess('Subject deleted successfully');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete subject');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleEditGrades = (subject) => {
        setFormData({
            subjectName: subject.subjectName,
            grades: { ...subject.grades }
        });
        setDialogMode('edit'); // <-- Set mode to 'edit'
        setOpenGradeDialog(true);
    };

    const getGradeColor = (grade) => {
        if (grade === null) return 'default';
        if (grade >= 90) return 'success';
        if (grade >= 75) return 'primary';
        return 'error';
    };

    return (
        <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: { xs: 1, sm: 2, md: 3 } }}>
            <Typography variant="h5" sx={{ mb: 3 }}>Data Store</Typography>
            
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            {/* Users List */}
            <Grid>
                <Paper sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
                        Users
                    </Typography>
                    <List>
                        {students.map((student) => (
                            <React.Fragment key={student.id}>
                                <ListItem
                                    button
                                    // selected={selectedStudent?.id === student.id}
                                    // onClick={() => handleStudentSelect(student.id)}
                                >
                                    <ListItemText
                                        primary={student.fullName}
                                        secondary={
                                            <React.Fragment>
                                                <Typography component="span" variant="body2">
                                                    {`Role: ${student.role} • Age: ${student.age || 'N/A'}`}
                                                </Typography>
                                            </React.Fragment>
                                        }
                                    />
                                    <ListItemSecondaryAction>
                                        {user.role === 'admin' && (
                                            <>
                                                <IconButton
                                                    edge="end"
                                                    onClick={() => handleEditUser(student)}
                                                    sx={{ mr: 1 }}
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton
                                                    edge="end"
                                                    onClick={() => handleDeleteUser(student.id)}
                                                    color="error"
                                                    disabled={student.id === user.id}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </>
                                        )}
                                        {(student.role === 'student' || user.role === 'admin') && (
                                            <IconButton
                                                edge="end"
                                                onClick={() => handleStudentSelect(student.id)}
                                                sx={{ ml: 1 }}
                                            >
                                                <SchoolIcon />
                                            </IconButton>
                                        )}
                                    </ListItemSecondaryAction>
                                </ListItem>
                                <Divider />
                            </React.Fragment>
                        ))}
                    </List>
                </Paper>
            </Grid>

            {/* Grade Dialog */}
            <Dialog open={openGradeDialog} onClose={() => setOpenGradeDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {/* Use dialogMode to set the title */}
                    {dialogMode === 'edit' ? 'Edit Grades' : 'Add New Subject'}
                </DialogTitle>
                <DialogContent>
                    {/* Only show subject name input if in 'add' mode */}
                    {dialogMode === 'add' && (
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Subject Name"
                            fullWidth
                            value={formData.subjectName}
                            onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                            sx={{ mb: 2 }}
                        />
                    )}
                    <Grid container spacing={2}>
                        {Object.entries(formData.grades).map(([period, grade]) => (
                            <Grid item xs={12} sm={6} key={period}>
                                <TextField
                                    label={period.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                    type="number"
                                    fullWidth
                                    value={grade}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        grades: {
                                            ...formData.grades,
                                            [period]: e.target.value ? Number(e.target.value) : null
                                        }
                                    })}
                                    inputProps={{ min: 0, max: 100 }}
                                />
                            </Grid>
                        ))}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenGradeDialog(false)}>Cancel</Button>
                    <Button
                        // Use dialogMode to select the correct handler and pass formData
                        onClick={() => dialogMode === 'edit' ? handleUpdateGrades(formData) : handleAddSubject()}
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={openUserDialog} onClose={() => setOpenUserDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit User</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="Email"
                            fullWidth
                            value={userFormData.email}
                            onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                        />
                        <TextField
                            label="Full Name"
                            fullWidth
                            value={userFormData.fullName}
                            onChange={(e) => setUserFormData({ ...userFormData, fullName: e.target.value })}
                        />
                        <TextField
                            label="Address"
                            fullWidth
                            value={userFormData.address}
                            onChange={(e) => setUserFormData({ ...userFormData, address: e.target.value })}
                        />
                        <TextField
                            label="Age"
                            type="number"
                            fullWidth
                            value={userFormData.age}
                            onChange={(e) => setUserFormData({ ...userFormData, age: e.target.value })}
                            InputProps={{ inputProps: { min: 0 } }}
                        />
                        <TextField
                            select
                            label="Role"
                            fullWidth
                            value={userFormData.role}
                            onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                            SelectProps={{
                                native: true,
                            }}
                            disabled={selectedStudent?.id === user.id} // Prevent changing own role
                        >
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                            <option value="admin">Admin</option>
                        </TextField>

                        <Divider sx={{ my: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                                Change Password (Optional)
                            </Typography>
                        </Divider>

                        <TextField
                            label="New Password"
                            type="password"
                            fullWidth
                            value={userFormData.password}
                            onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                            helperText="Leave blank to keep current password"
                        />
                        {userFormData.password && (
                            <TextField
                                label="Confirm New Password"
                                type="password"
                                fullWidth
                                value={userFormData.confirmPassword}
                                onChange={(e) => setUserFormData({ ...userFormData, confirmPassword: e.target.value })}
                                error={userFormData.password !== userFormData.confirmPassword}
                                helperText={userFormData.password !== userFormData.confirmPassword ? "Passwords don't match" : ""}
                            />
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenUserDialog(false)}>Cancel</Button>
                    <Button 
                        onClick={handleUpdateUser} 
                        variant="contained"
                        disabled={loading}
                    >
                        {loading ? 'Updating...' : 'Update User'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default DataStore;