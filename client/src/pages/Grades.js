import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    Alert,
    Chip,
    Card,           // <-- Added Card
    CardContent,    // <-- Added CardContent
    CardHeader,     // <-- Added CardHeader
    Divider         // <-- Added Divider
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import { academic } from '../services/api';

const Grades = () => {

    // Get user from context
    // NOTE: This require statement is non-standard for React components. 
    // Assuming AuthContext is correctly implemented and exported.
    const { user } = require('../contexts/AuthContext').useAuth();
    const isAdmin = user?.role === 'admin';
    // console.log('User role:', user?.role);
    // console.log('User:', user);

    const [units, setUnits] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [openGradeDialog, setOpenGradeDialog] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
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
        loadUnits();
    }, []);

    const loadUnits = async () => {
        try {
            // Check if user is available before attempting to load grades
            if (!user?.id) {
                // If user context isn't fully loaded, we can return or set an error
                console.warn("User ID not available to load grades.");
                return;
            }
            const response = await academic.getStudentGrades(user.id);
            setUnits(response.data);
        } catch (err) {
            setError('Failed to load units');
        }
    };

    const handleAddSubject = async () => {
        if (!isAdmin) return;
        try {
            setLoading(true);
            setError('');
            // NOTE: academic.addSubject should probably take a student ID if this is a student-specific view
            await academic.addSubject({ subjectName: formData.subjectName }); 
            await loadUnits();
            setOpenDialog(false);
            setFormData({ ...formData, subjectName: '' });
            setSuccess('Subject added successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add subject');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateGrades = async () => {
        if (!isAdmin || !selectedSubject) return;
        try {
            setLoading(true);
            setError('');
            // NOTE: academic.updateGrades should probably take a student ID if this is a student-specific view
            await academic.updateGrades(selectedSubject.subjectName, formData.grades);
            await loadUnits();
            setOpenGradeDialog(false);
            setSuccess('Grades updated successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update grades');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSubject = async (subjectName) => {
        if (!isAdmin) return;
        if (window.confirm('Are you sure you want to delete this subject?')) {
            try {
                setLoading(true);
                setError('');
                // NOTE: academic.deleteSubject should probably take a student ID if this is a student-specific view
                await academic.deleteSubject(subjectName);
                await loadUnits();
                setSuccess('Subject deleted successfully');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete subject');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleEditGrades = (subject) => {
        if (!isAdmin) return;
        setSelectedSubject(subject);
        setFormData({
            ...formData,
            grades: { ...subject.grades }
        });
        setOpenGradeDialog(true);
    };

    const getGradeColor = (grade) => {
        if (grade === null || isNaN(grade)) return 'default';
        if (grade >= 90) return 'success';
        if (grade >= 75) return 'primary';
        return 'error';
    };

    // Responsive styles
    const responsiveBox = {
        width: '100%',
        maxWidth: 1000, // Slightly wider for better table viewing
        mx: 'auto',
        px: { xs: 1, sm: 2, md: 3 },
        py: { xs: 1, sm: 2, md: 3 }
    };
    
    // Helper function to capitalize grade period names
    const formatPeriodName = (period) => {
        return period.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
    };

    return (
        <Box sx={responsiveBox}>
            <Typography variant="h4" gutterBottom sx={{ color: 'primary.dark', mb: 3 }}>
                Academic Records
            </Typography>
            
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Card raised> {/* Use a Card for elevation and structure */}
                <CardHeader
                    title={isAdmin ? "Manage Student Grades" : "Your Grade Overview"}
                    action={
                        isAdmin && (
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setOpenDialog(true)}
                                sx={{ minWidth: { xs: 'auto', sm: 150 } }}
                            >
                                Add Subject
                            </Button>
                        )
                    }
                    sx={{ pb: 1 }}
                />
                <Divider />
                <CardContent sx={{ p: 0 }}>
                    {units.length === 0 ? (
                        <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                            <Typography variant="body1">
                                {isAdmin 
                                    ? "No subjects found. Use the 'Add Subject' button to get started."
                                    : "No academic records available yet."
                                }
                            </Typography>
                        </Box>
                    ) : (
                        <TableContainer sx={{ overflowX: 'auto', minWidth: 600 }}>
                            <Table size="medium">
                                <TableHead sx={{ bgcolor: 'grey.100' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Subject</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>1st</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>2nd</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>3rd</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>4th</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Final Average</TableCell>
                                        {isAdmin && <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {units.map((unit) => (
                                        <TableRow 
                                            key={unit.subjectName} 
                                            hover
                                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                        >
                                            <TableCell component="th" scope="row" sx={{ fontWeight: 500 }}>
                                                {unit.subjectName}
                                            </TableCell>
                                            {['firstGrading', 'secondGrading', 'thirdGrading', 'fourthGrading'].map((period) => (
                                                <TableCell key={period} align="center">
                                                    {unit.grades[period] !== null ? (
                                                        <Chip
                                                            label={unit.grades[period]}
                                                            color={getGradeColor(unit.grades[period])}
                                                            size="small"
                                                            variant="outlined" // Use outlined for a cleaner look
                                                        />
                                                    ) : (
                                                        <Typography variant="body2" color="textSecondary">-</Typography>
                                                    )}
                                                </TableCell>
                                            ))}
                                            <TableCell align="center">
                                                <Chip
                                                    label={unit.average?.toFixed(2) || '-'}
                                                    color={getGradeColor(unit.average)}
                                                    size="medium" // Slightly larger chip for the final average
                                                />
                                            </TableCell>
                                            {isAdmin && (
                                                <TableCell align="right">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleEditGrades(unit)}
                                                        color="primary"
                                                        aria-label={`Edit grades for ${unit.subjectName}`}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDeleteSubject(unit.subjectName)}
                                                        color="error"
                                                        aria-label={`Delete subject ${unit.subjectName}`}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>

            {/* Add Subject Dialog - Keep it clean and focused */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="xs">
                <DialogTitle>Add New Subject</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Subject Name"
                        fullWidth
                        value={formData.subjectName}
                        onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                        variant="outlined" // Use outlined variant for text fields
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)} color="inherit">Cancel</Button>
                    <Button onClick={handleAddSubject} disabled={loading} variant="contained">
                        {loading ? 'Adding...' : 'Add Subject'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Grades Dialog - Use a clean layout with helper text */}
            <Dialog open={openGradeDialog} onClose={() => setOpenGradeDialog(false)} fullWidth maxWidth="xs">
                <DialogTitle>Edit Grades - {selectedSubject?.subjectName}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                        <Typography variant="body2" color="textSecondary">
                            Enter grades between 0 and 100. Leave empty for 'Not Graded'.
                        </Typography>
                        <Divider />
                        {['firstGrading', 'secondGrading', 'thirdGrading', 'fourthGrading'].map((period) => (
                            <TextField
                                key={period}
                                label={formatPeriodName(period)}
                                type="number"
                                fullWidth
                                value={formData.grades[period] === null ? '' : formData.grades[period]}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    grades: {
                                        ...formData.grades,
                                        [period]: e.target.value ? Number(e.target.value) : null
                                    }
                                })}
                                inputProps={{ min: 0, max: 100 }}
                                variant="outlined"
                            />
                        ))}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenGradeDialog(false)} color="inherit">Cancel</Button>
                    <Button onClick={handleUpdateGrades} disabled={loading} variant="contained" color="primary">
                        {loading ? 'Saving...' : 'Save Grades'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Grades;