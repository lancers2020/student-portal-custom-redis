import React, { useState, useEffect, useRef } from 'react';
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
    ListItemIcon,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Person as PersonIcon,
    School as SchoolIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { academic, classes as classesApi } from '../services/api';

const calculateAverage = (grades) => {
    if (!grades) return '-';
    const validGrades = Object.values(grades).filter(g => g !== null);
    if (validGrades.length === 0) return '-';
    return (validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length).toFixed(2);
};

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
    const [openGradingDialog, setOpenGradingDialog] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [grades, setGrades] = useState({});
    const [editingGrades, setEditingGrades] = useState(false);
    const initialGradesRef = useRef({});

    const [subjectInput, setSubjectInput] = useState(formData.subjects.join(', '));

    useEffect(() => {
        setSubjectInput(formData.subjects.join(', '));
    }, [formData.subjects]);

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
            const response = await classesApi.getTeacherClasses(user.id);
            setClasses(response.data);
        } catch (err) {
            setError('Failed to load classes');
        }
    };

    const loadAllStudents = async () => {
        try {
            const response = await academic.getStudents();
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
            await classesApi.createClass({
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

            // Find new students by comparing current and previous student lists
            const currentStudentIds = selectedClass.students.map(s => s.id);
            const newStudents = formData.students.filter(s => !currentStudentIds.includes(s.id));

            // First, update the class with new students
            await classesApi.updateClassStudents(selectedClass.id, formData.students);

            // Then, initialize subjects for new students
            if (newStudents.length > 0) {
                const initializationPromises = newStudents.flatMap(student =>
                    selectedClass.subjects.map(subject =>
                        academic.addSubjectForStudent(student.id, {
                            subjectName: subject.name,
                            grades: {
                                firstGrading: null,
                                secondGrading: null,
                                thirdGrading: null,
                                fourthGrading: null
                            }
                        })
                    )
                );

                try {
                    await Promise.all(initializationPromises);
                } catch (initError) {
                    console.error('Error initializing subjects for new students:', initError);
                    setError('Students added but there was an error initializing their subjects. Please try editing grades later.');
                    setLoading(false);
                    return;
                }
            }

            await loadClasses();
            await loadAllStudents();
            setOpenStudentDialog(false);
            setSuccess('Students and their subjects updated successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update students');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenGrading = async (classData, subject) => {
        try {
            setLoading(true);
            setError('');
            const gradePromises = classData.students.map(s => 
                academic.getStudentGrades(s.id)
            );
            const allGradesResponses = await Promise.all(gradePromises);
            const allGradeData = allGradesResponses.map(response => response.data);
            const subjectGrades = {};
            
            // Process each student's grades
            for (const student of classData.students) {
                const studentGrades = allGradeData.find(grades => 
                    grades.some(g => g.studentId === student.id)
                );
                
                const existingGrades = studentGrades?.find(g => 
                    g.studentId === student.id && g.subjectName === subject.name
                );

                if (!existingGrades) {
                    // Initialize grades if they don't exist
                    try {
                        await academic.addSubjectForStudent(student.id, {
                            subjectName: subject.name,
                            grades: {
                                firstGrading: null,
                                secondGrading: null,
                                thirdGrading: null,
                                fourthGrading: null
                            }
                        });
                        subjectGrades[student.id] = {
                            firstGrading: null,
                            secondGrading: null,
                            thirdGrading: null,
                            fourthGrading: null
                        };
                    } catch (initError) {
                        console.error(`Error initializing grades for student ${student.id}:`, initError);
                        // Continue with other students if one fails
                    }
                } else {
                    subjectGrades[student.id] = existingGrades.grades;
                }
            }
            
            setGrades(subjectGrades);
            // store a snapshot of the initial grades so we can detect changes later
            initialGradesRef.current = JSON.parse(JSON.stringify(subjectGrades || {}));
            setSelectedClass(classData);
            setSelectedSubject(subject);
            setOpenGradingDialog(true);
        } catch (err) {
            console.error('Error loading student grades:', err);
            setError('Failed to load grades. Check API service.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateGrades = async () => {
        try {
            setLoading(true);
            setError('');

            // determine which students actually changed
            const initial = initialGradesRef.current || {};
            const changed = Object.entries(grades).filter(([studentId, studentGrades]) => {
                const initialGrades = initial[studentId];
                // compare by stringifying — handles nulls and numbers reliably here
                return JSON.stringify(initialGrades) !== JSON.stringify(studentGrades);
            });

            if (changed.length === 0) {
                setSuccess('No changes to save');
                setEditingGrades(false);
                return;
            }

            // only update students that changed
            await Promise.all(
                changed.map(([studentId, studentGrades]) =>
                    academic.updateStudentGrades(studentId, selectedSubject.name, studentGrades)
                )
            );

            // refresh initial snapshot to the latest saved state
            initialGradesRef.current = JSON.parse(JSON.stringify(grades || {}));
            setSuccess('Grades updated successfully');
            setEditingGrades(false);
        } catch (err) {
            console.error('Error updating grades:', err);
            setError('Failed to update grades');
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
                await classesApi.deleteClass(classId);
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
                                            onClick={() => handleOpenGrading(classData, subject)}
                                            sx={{ mr: 1, mb: 1, cursor: 'pointer' }}
                                            color="primary"
                                            variant="outlined"
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
                        value={subjectInput} 
                        onChange={(e) => setSubjectInput(e.target.value)} 
                        onBlur={() => {
                            setFormData({
                                ...formData,
                                subjects: subjectInput.split(',').map(s => s.trim()).filter(Boolean)
                            });
                        }}
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
                                helperText={
                                    students.length === 0 
                                        ? "No students available (all students are already assigned to classes)"
                                        : "Only showing students who aren't assigned to any class"
                                }
                            />
                        )}
                        noOptionsText="No unassigned students available"
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
                        sx={{padding: '5px'}}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Select Students"
                                fullWidth
                                helperText={
                                    students.length === 0 
                                        ? "No students available (all students are already assigned to classes)"
                                        : "Only showing students who aren't assigned to any class"
                                }
                            />
                        )}
                        noOptionsText="No unassigned students available"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenStudentDialog(false)}>Cancel</Button>
                    <Button onClick={handleUpdateStudents} disabled={loading}>
                        {loading ? 'Updating...' : 'Update'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Grading Dialog */}
            <Dialog 
                open={openGradingDialog} 
                onClose={() => {
                    setOpenGradingDialog(false);
                    setEditingGrades(false);
                }}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {selectedSubject?.name} - Grades
                        <Button
                            variant={editingGrades ? "contained" : "outlined"}
                            color={editingGrades ? "success" : "primary"}
                            onClick={() => {
                                if (editingGrades) {
                                    handleUpdateGrades();
                                } else {
                                    setEditingGrades(true);
                                }
                            }}
                            disabled={loading}
                        >
                            {loading ? 'Processing...' : editingGrades ? 'Save Grades' : 'Edit Grades'}
                        </Button>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Student</TableCell>
                                    <TableCell align="center">1st Grading</TableCell>
                                    <TableCell align="center">2nd Grading</TableCell>
                                    <TableCell align="center">3rd Grading</TableCell>
                                    <TableCell align="center">4th Grading</TableCell>
                                    <TableCell align="center">Final Grade</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {selectedClass?.students.map((student) => (
                                    <TableRow key={student.id}>
                                        <TableCell>{student.fullName}</TableCell>
                                        {['firstGrading', 'secondGrading', 'thirdGrading', 'fourthGrading'].map((period) => (
                                            <TableCell key={period} align="center">
                                                {editingGrades ? (
                                                    <TextField
                                                        type="number"
                                                        value={grades[student.id]?.[period] || ''}
                                                        onChange={(e) => {
                                                            const value = e.target.value === '' ? null : Number(e.target.value);
                                                            setGrades(prev => ({
                                                                ...prev,
                                                                [student.id]: {
                                                                    ...prev[student.id],
                                                                    [period]: value
                                                                }
                                                            }));
                                                        }}
                                                        InputProps={{
                                                            inputProps: { min: 0, max: 100 }
                                                        }}
                                                        size="small"
                                                        sx={{ width: 70 }}
                                                    />
                                                ) : (
                                                    grades[student.id]?.[period] || '-'
                                                )}
                                            </TableCell>
                                        ))}
                                        <TableCell align="center">
                                            {calculateAverage(grades[student.id])}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => {
                            setOpenGradingDialog(false);
                            setEditingGrades(false);
                        }}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Class;