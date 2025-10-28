import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Tabs,
    Tab,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    Fab
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Save as SaveIcon
} from '@mui/icons-material';
import { notebook } from '../services/api';

const Notebook = () => {
    const [sheets, setSheets] = useState([]);
    const [selectedSheet, setSelectedSheet] = useState(null);
    const [activeTab, setActiveTab] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        content: ''
    });

    useEffect(() => {
        loadNotebook();
    }, []);

    const loadNotebook = async () => {
        try {
            const response = await notebook.get();
            setSheets(response.data.sheets);
            if (response.data.sheets.length > 0) {
                // setSelectedSheet(response.data.sheets[0]);
                if (selectedSheet) {
                    setSelectedSheet(prev => {
                        const uwu = response.data.sheets.find(f => f.id == prev.id);
                        return uwu;
                    });
                }
                if (!selectedSheet) setSelectedSheet(response.data.sheets[0]);
            }
        } catch (err) {
            setError('Failed to load notebook');
        }
    };

    const handleAddSheet = async () => {
        try {
            setLoading(true);
            setError('');
            await notebook.addSheet({ title: formData.title });
            await loadNotebook();
            setOpenDialog(false);
            setFormData({ title: '', content: '' });
            setSuccess('Sheet added successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add sheet');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveContent = async () => {
        try {
            setLoading(true);
            setError('');
            await notebook.updateSheet(selectedSheet.id, {
                content: formData.content
            });
            await loadNotebook();
            setEditMode(false);
            setSuccess('Content saved successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save content');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSheet = async (sheetId) => {
        if (window.confirm('Are you sure you want to delete this sheet?')) {
            try {
                setLoading(true);
                setError('');
                await notebook.deleteSheet(sheetId);
                await loadNotebook();
                setSuccess('Sheet deleted successfully');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete sheet');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
        setSelectedSheet(sheets[newValue]);
        setFormData(prev => ({
            ...prev,
            content: sheets[newValue].content
        }));
        setEditMode(false);
    };

    return (
        <Box>
            <Paper sx={{ mb: 3 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Tabs
                            value={activeTab}
                            onChange={handleTabChange}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{ flexGrow: 1 }}
                        >
                            {sheets.map((sheet, index) => (
                                <Tab
                                    key={sheet.id}
                                    label={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {sheet.title}
                                            <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteSheet(sheet.id);
                                                }}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    }
                                />
                            ))}
                        </Tabs>
                        <Button
                            startIcon={<AddIcon />}
                            onClick={() => setOpenDialog(true)}
                            sx={{ m: 1 }}
                        >
                            New Sheet
                        </Button>
                    </Box>
                </Box>

                {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ m: 2 }}>{success}</Alert>}

                {selectedSheet && (
                    <Box sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="h6">{selectedSheet.title}</Typography>
                            <IconButton onClick={() => setEditMode(!editMode)}>
                                {editMode ? <div 
                                style={{
                                    backgroundColor: '#ABE7B2', 
                                    padding: '2px 2px 0', 
                                    borderRadius: '5px', 
                                    margin: 0
                                }}><SaveIcon /></div> : <div 
                                style={{
                                    backgroundColor: '#93BFC7', 
                                    padding: '2px 2px 0', 
                                    borderRadius: '5px', 
                                    margin: 0
                                }}><EditIcon /></div>}
                            </IconButton>
                        </Box>
                        {editMode ? (
                            <TextField
                                fullWidth
                                multiline
                                rows={20}
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                variant="outlined"
                            />
                        ) : (
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 2,
                                    minHeight: '500px',
                                    whiteSpace: 'pre-wrap'
                                }}
                            >
                                {selectedSheet.content || 'No content yet. Click edit to add content.'}
                            </Paper>
                        )}
                        {editMode && (
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 2 }}>
                                <Button
                                    variant="outlined"
                                    onClick={() => setEditMode(false)}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="contained"
                                    onClick={handleSaveContent}
                                    disabled={loading}
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </Box>
                        )}
                    </Box>
                )}
            </Paper>

            {/* Add Sheet Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>Add New Sheet</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Sheet Title"
                        fullWidth
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddSheet} disabled={loading}>
                        {loading ? 'Adding...' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Fab
                color="primary"
                sx={{ position: 'fixed', bottom: 16, right: 16 }}
                onClick={() => setOpenDialog(true)}
            >
                <AddIcon />
            </Fab>
        </Box>
    );
};

export default Notebook;