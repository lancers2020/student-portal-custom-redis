import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    Alert,
    Card,
    CardContent,
    CardHeader,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Grid,
    Autocomplete,
    Chip,
    ListItemIcon
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Person as PersonIcon,
    School as SchoolIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { academic } from '../services/api';

const Class = () => {
    const { user } = useAuth();
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [students, setStudents] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        subjects: [],
        students: []
    });
    const [openStudentDialog, setOpenStudentDialog] = useState(false);

    useEffect(() => {
        if (!user) return;
        if (user.role !== 'teacher') {
            setError('Access denied. Only teachers can manage classes.');
            return;
        }
        loadClasses();
        loadAllStudents();
    }, [user]);

    const loadClasses = async () => {
        try {
            const response = await academic.getTeacherClasses(user.id);
            setClasses(response.data);
        } catch (err) {
            setError('Failed to load classes');
        }
    };

    const loadAllStudents = async () => {
        try {
            const response = await academic.getAllStudents();
            setStudents(response.data);
        } catch (err) {
            setError('Failed to load students');
        }
    };

    const handleCreateClass = async () => {
        try {
            if (!user || user.role !== 'teacher') {
                setError('Access denied. Only teachers can create classes.');
                return;
            }
            if (!formData.name || !formData.subjects.length) {
                setError('Class name and at least one subject are required.');
                return;
            }
            setLoading(true);
            setError('');
            await academic.createClass({
                teacherId: user.id,
                name: formData.name,
                subjects: formData.subjects.map(s => ({ name: s })),
                students: formData.students
            });
            await loadClasses();
            setOpenDialog(false);
            setFormData({ name: '', subjects: [], students: [] });
            setSuccess('Class created successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create class');
        } finally {
            setLoading(false);
        }
    };

    const handleEditStudents = (classData) => {
        setSelectedClass(classData);
        setFormData({
            ...formData,
            students: classData.students
        });
        setOpenStudentDialog(true);
    };

    const handleUpdateStudents = async () => {
        try {
            if (!user || user.role !== 'teacher') {
                setError('Access denied. Only teachers can update class students.');
                return;
            }
            if (!selectedClass) {
                setError('No class selected.');
                return;
            }
            setLoading(true);
            setError('');
            await academic.updateClassStudents(selectedClass.id, formData.students);
            await loadClasses();
            setOpenStudentDialog(false);
            setSuccess('Students updated successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update students');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClass = async (classId) => {
        if (!user || user.role !== 'teacher') {
            setError('Access denied. Only teachers can delete classes.');
            return;
        }
        if (window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
            try {
                setLoading(true);
                setError('');
                await academic.deleteClass(classId);
                await loadClasses();
                setSuccess('Class deleted successfully');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete class');
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: { xs: 1, sm: 2, md: 3 } }}>
            <Typography variant="h4" gutterBottom sx={{ color: 'primary.dark', mb: 3 }}>
                Class Management
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setOpenDialog(true)}
                        >
                            Create New Class
                        </Button>
                    </Box>
                </Grid>

                {classes.map((classData) => (
                    <Grid item xs={12} key={classData.id}>
                        <Card>
                            <CardHeader
                                title={classData.name}
                                action={
                                    <Box>
                                        <IconButton
                                            onClick={() => handleEditStudents(classData)}
                                            color="primary"
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            onClick={() => handleDeleteClass(classData.id)}
                                            color="error"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Box>
                                }
                            />
                            <Divider />
                            <CardContent>
                                <Typography variant="subtitle1" gutterBottom>
                                    Subjects:
                                </Typography>
                                <Box sx={{ mb: 2 }}>
                                    {classData.subjects.map((subject, index) => (
                                        <Chip
                                            key={index}
                                            label={subject.name}
                                            sx={{ mr: 1, mb: 1 }}
                                        />
                                    ))}
                                </Box>
                                <Typography variant="subtitle1" gutterBottom>
                                    Students:
                                </Typography>
                                <List dense>
                                    {classData.students.map((student) => (
                                        <ListItem key={student.id}>
                                            <ListItemIcon>
                                                <PersonIcon />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={student.fullName}
                                                secondary={`ID: ${student.id}`}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Create Class Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create New Class</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Class Name"
                        fullWidth
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        label="Subjects (comma-separated)"
                        fullWidth
                        value={formData.subjects.join(', ')}
                        onChange={(e) => setFormData({
                            ...formData,
                            subjects: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        })}
                        helperText="Enter subject names separated by commas"
                        sx={{ mb: 2 }}
                    />
                    <Autocomplete
                        multiple
                        options={students}
                        getOptionLabel={(option) => option.fullName}
                        value={formData.students}
                        onChange={(e, newValue) => setFormData({
                            ...formData,
                            students: newValue
                        })}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Select Students"
                                fullWidth
                            />
                        )}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateClass} disabled={loading}>
                        {loading ? 'Creating...' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Students Dialog */}
            <Dialog open={openStudentDialog} onClose={() => setOpenStudentDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Class Students</DialogTitle>
                <DialogContent>
                    <Autocomplete
                        multiple
                        options={students}
                        getOptionLabel={(option) => option.fullName}
                        value={formData.students}
                        onChange={(e, newValue) => setFormData({
                            ...formData,
                            students: newValue
                        })}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Select Students"
                                fullWidth
                            />
                        )}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenStudentDialog(false)}>Cancel</Button>
                    <Button onClick={handleUpdateStudents} disabled={loading}>
                        {loading ? 'Updating...' : 'Update'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Class;