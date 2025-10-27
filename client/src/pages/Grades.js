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
    Chip
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import { academic } from '../services/api';

const Grades = () => {

    // Get user from context
    const { user } = require('../contexts/AuthContext').useAuth();
    const isAdmin = user?.role === 'admin';
    console.log('User role:', user?.role);
    console.log('User:', user);

    // ...existing code...
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
            const response = await academic.getUnits();
            setUnits(response.data);
        } catch (err) {
            setError('Failed to load units');
        }
    };

    // ...existing code...
    const handleAddSubject = async () => {
        if (!isAdmin) return;
        try {
            setLoading(true);
            setError('');
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
        if (!isAdmin) return;
        try {
            setLoading(true);
            setError('');
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
        if (grade === null) return 'default';
        if (grade >= 90) return 'success';
        if (grade >= 75) return 'primary';
        return 'error';
    };

    // Responsive styles
    const responsiveBox = {
        width: '100%',
        maxWidth: 900,
        mx: 'auto',
        px: { xs: 1, sm: 2, md: 3 },
        py: { xs: 1, sm: 2, md: 3 }
    };

    return (
        <Box sx={responsiveBox}>
            <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}>
                <Typography variant="h5" sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>Academic Records</Typography>
                {isAdmin && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setOpenDialog(true)}
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                    >
                        Add Subject
                    </Button>
                )}
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto' }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Subject</TableCell>
                            <TableCell align="center">1st Grading</TableCell>
                            <TableCell align="center">2nd Grading</TableCell>
                            <TableCell align="center">3rd Grading</TableCell>
                            <TableCell align="center">4th Grading</TableCell>
                            <TableCell align="center">Average</TableCell>
                            {isAdmin && <TableCell align="right">Actions</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {units.map((unit) => (
                            <TableRow key={unit.subjectName}>
                                <TableCell component="th" scope="row">
                                    {unit.subjectName}
                                </TableCell>
                                {['firstGrading', 'secondGrading', 'thirdGrading', 'fourthGrading'].map((period) => (
                                    <TableCell key={period} align="center">
                                        {unit.grades[period] !== null ? (
                                            <Chip
                                                label={unit.grades[period]}
                                                color={getGradeColor(unit.grades[period])}
                                                size="small"
                                            />
                                        ) : (
                                            '-'
                                        )}
                                    </TableCell>
                                ))}
                                <TableCell align="center">
                                    <Chip
                                        label={unit.average?.toFixed(2) || '-'}
                                        color={getGradeColor(unit.average)}
                                        size="small"
                                    />
                                </TableCell>
                                {isAdmin && (
                                    <TableCell align="right">
                                        <IconButton
                                            size="small"
                                            onClick={() => handleEditGrades(unit)}
                                            color="primary"
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleDeleteSubject(unit.subjectName)}
                                            color="error"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Add Subject Dialog */}
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
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddSubject} disabled={loading}>
                        {loading ? 'Adding...' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Grades Dialog */}
            <Dialog open={openGradeDialog} onClose={() => setOpenGradeDialog(false)} fullWidth maxWidth="xs">
                <DialogTitle>Edit Grades - {selectedSubject?.subjectName}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                        {['firstGrading', 'secondGrading', 'thirdGrading', 'fourthGrading'].map((period) => (
                            <TextField
                                key={period}
                                label={period.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                                type="number"
                                value={formData.grades[period]}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    grades: {
                                        ...formData.grades,
                                        [period]: e.target.value ? Number(e.target.value) : null
                                    }
                                })}
                                inputProps={{ min: 0, max: 100 }}
                            />
                        ))}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenGradeDialog(false)}>Cancel</Button>
                    <Button onClick={handleUpdateGrades} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Grades'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Grades;