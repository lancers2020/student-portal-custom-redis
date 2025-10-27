import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    TextField,
    Button,
    Alert,
    Tab,
    Tabs,
    Card,
    CardContent,
    Avatar,
    Chip,
    IconButton
} from '@mui/material';
import { Person, Edit, Save, ColorLens } from '@mui/icons-material';
import { profile as profileApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const avatarParts = {
    nose: ['default', 'pointed', 'round', 'wide'],
    eyes: ['default', 'round', 'almond', 'narrow'],
    lips: ['default', 'full', 'thin', 'heart'],
    hair: ['default', 'short', 'long', 'curly', 'straight']
};

const Profile = () => {
    const { user, updateUser } = useAuth();
    const [tab, setTab] = useState(0);
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [formData, setFormData] = useState({
        fullName: user?.fullName || '',
        address: user?.address || '',
        age: user?.age || '',
        themeColor: user?.themeColor || '#1a73e8'
    });
    const [avatarConfig, setAvatarConfig] = useState(user?.avatar || {
        nose: 'default',
        eyes: 'default',
        lips: 'default',
        hair: 'default'
    });
    const [classmates, setClassmates] = useState([]);

    useEffect(() => {
        loadClassmates();
    }, []);

    const loadClassmates = async () => {
        try {
            const response = await profileApi.getClassmates();
            setClassmates(response.data);
        } catch (err) {
            setError('Failed to load classmates');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAvatarChange = (part, value) => {
        setAvatarConfig(prev => ({
            ...prev,
            [part]: value
        }));
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            setError('');
            setSuccess('');

            // Update profile info
            const response = await profileApi.update(formData);
            
            // Update avatar
            await profileApi.updateAvatar(avatarConfig);

            updateUser({ ...response.data.user, avatar: avatarConfig });
            setSuccess('Profile updated successfully');
            setEditMode(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveClassmate = async (classmateId) => {
        try {
            await profileApi.updateClassmates({ action: 'remove', classmateId });
            await loadClassmates();
            setSuccess('Classmate removed successfully');
        } catch (err) {
            setError('Failed to remove classmate');
        }
    };

    return (
        <Box>
            <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h5">Profile Information</Typography>
                    <IconButton onClick={() => setEditMode(!editMode)}>
                        {editMode ? <Save /> : <Edit />}
                    </IconButton>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)} sx={{ mb: 3 }}>
                    <Tab label="Basic Info" />
                    <Tab label="Avatar" />
                    <Tab label="Classmates" />
                </Tabs>

                {tab === 0 && (
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Full Name"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                disabled={!editMode}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Age"
                                name="age"
                                type="number"
                                value={formData.age}
                                onChange={handleChange}
                                disabled={!editMode}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Address"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                disabled={!editMode}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <ColorLens />
                                <TextField
                                    label="Theme Color"
                                    name="themeColor"
                                    type="color"
                                    value={formData.themeColor}
                                    onChange={handleChange}
                                    disabled={!editMode}
                                    sx={{ width: 150 }}
                                />
                            </Box>
                        </Grid>
                    </Grid>
                )}

                {tab === 1 && (
                    <Grid container spacing={3}>
                        {Object.entries(avatarParts).map(([part, options]) => (
                            <Grid item xs={12} sm={6} key={part}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" sx={{ mb: 2 }}>
                                            {part.charAt(0).toUpperCase() + part.slice(1)}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            {options.map(option => (
                                                <Chip
                                                    key={option}
                                                    label={option}
                                                    onClick={() => editMode && handleAvatarChange(part, option)}
                                                    color={avatarConfig[part] === option ? 'primary' : 'default'}
                                                    disabled={!editMode}
                                                />
                                            ))}
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}

                {tab === 2 && (
                    <Grid container spacing={2}>
                        {classmates.map((classmate) => (
                            <Grid item xs={12} sm={6} md={4} key={classmate.id}>
                                <Card>
                                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar>
                                            <Person />
                                        </Avatar>
                                        <Box sx={{ flexGrow: 1 }}>
                                            <Typography variant="subtitle1">
                                                {classmate.fullName}
                                            </Typography>
                                        </Box>
                                        <Button
                                            size="small"
                                            color="error"
                                            onClick={() => handleRemoveClassmate(classmate.id)}
                                        >
                                            Remove
                                        </Button>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}

                {editMode && (
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        <Button
                            variant="outlined"
                            onClick={() => setEditMode(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleSave}
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </Box>
                )}
            </Paper>
        </Box>
    );
};

export default Profile;