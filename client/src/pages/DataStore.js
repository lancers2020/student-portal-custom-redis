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
    // NEW STATE: Tracks if we are adding a new subject or editing existing grades
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

            <Grid container spacing={2}>
                {/* Students List */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ mb: 2 }}>
                        <Typography variant="h6" sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
                            Students
                        </Typography>
                        <List>
                            {students.map((student) => (
                                <React.Fragment key={student.id}>
                                    <ListItem
                                        button
                                        selected={selectedStudent?.id === student.id}
                                        onClick={() => handleStudentSelect(student.id)}
                                    >
                                        <ListItemText
                                            primary={student.fullName}
                                            secondary={`Age: ${student.age}`}
                                        />
                                        <ListItemSecondaryAction>
                                            <IconButton
                                                edge="end"
                                                onClick={() => handleStudentSelect(student.id)}
                                            >
                                                <SchoolIcon />
                                            </IconButton>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                    <Divider />
                                </React.Fragment>
                            ))}
                        </List>
                    </Paper>
                </Grid>

                {/* Student Details and Grades */}
                <Grid item xs={12} md={8}>
                    {selectedStudent ? (
                        <Paper>
                            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                                <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
                                    <Tab label="Grades" />
                                    <Tab label="Details" />
                                </Tabs>
                            </Box>

                            {/* Grades Tab */}
                            {selectedTab === 0 && (
                                <Box sx={{ p: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                        <Typography variant="h6">
                                            {selectedStudent.fullName}'s Grades
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            startIcon={<AddIcon />}
                                            onClick={() => {
                                                setFormData({
                                                    subjectName: '',
                                                    grades: {
                                                        firstGrading: '',
                                                        secondGrading: '',
                                                        thirdGrading: '',
                                                        fourthGrading: ''
                                                    }
                                                });
                                                setDialogMode('add'); // <-- Set mode to 'add'
                                                setOpenGradeDialog(true);
                                            }}
                                        >
                                            Add Subject
                                        </Button>
                                    </Box>

                                    <Grid container spacing={2}>
                                        {selectedStudent.grades?.map((subject) => (
                                            <Grid item xs={12} key={subject.subjectName}>
                                                <Card>
                                                    <CardContent>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                                            <Typography variant="h6">{subject.subjectName}</Typography>
                                                            <Box>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleEditGrades(subject)}
                                                                >
                                                                    <EditIcon />
                                                                </IconButton>
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    onClick={() => handleDeleteSubject(subject.subjectName)}
                                                                >
                                                                    <DeleteIcon />
                                                                </IconButton>
                                                            </Box>
                                                        </Box>
                                                        <Grid container spacing={2}>
                                                            {Object.entries(subject.grades).map(([period, grade]) => (
                                                                <Grid item xs={6} sm={3} key={period}>
                                                                    <Typography variant="body2" color="textSecondary">
                                                                        {period.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                                                    </Typography>
                                                                    <Typography
                                                                        variant="body1"
                                                                        color={getGradeColor(grade)}
                                                                    >
                                                                        {grade || '-'}
                                                                    </Typography>
                                                                </Grid>
                                                            ))}
                                                            <Grid item xs={6} sm={3}>
                                                                <Typography variant="body2" color="textSecondary">
                                                                    Average
                                                                </Typography>
                                                                <Typography
                                                                    variant="body1"
                                                                    color={getGradeColor(subject.average)}
                                                                >
                                                                    {subject.average?.toFixed(2) || '-'}
                                                                </Typography>
                                                            </Grid>
                                                        </Grid>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Box>
                            )}

                            {/* Details Tab */}
                            {selectedTab === 1 && (
                                <Box sx={{ p: 2 }}>
                                    <Typography variant="h6" gutterBottom>Student Information</Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="textSecondary">Full Name</Typography>
                                            <Typography variant="body1">{selectedStudent.fullName}</Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="textSecondary">Email</Typography>
                                            <Typography variant="body1">{selectedStudent.email}</Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="textSecondary">Age</Typography>
                                            <Typography variant="body1">{selectedStudent.age}</Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="textSecondary">Address</Typography>
                                            <Typography variant="body1">{selectedStudent.address}</Typography>
                                        </Grid>
                                    </Grid>
                                </Box>
                            )}
                        </Paper>
                    ) : (
                        <Paper sx={{ p: 3, textAlign: 'center' }}>
                            <Typography variant="body1" color="textSecondary">
                                Select a student to view their details and manage grades
                            </Typography>
                        </Paper>
                    )}
                </Grid>
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
        </Box>
    );
};

export default DataStore;