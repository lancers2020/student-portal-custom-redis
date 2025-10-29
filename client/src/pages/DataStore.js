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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    Button
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { academic } from '../services/api';

const DataStore = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [openUserDialog, setOpenUserDialog] = useState(false);
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
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const response = await academic.getAllUsers();
            console.log(':::response', response);
            setUsers(response.data);
        } catch (err) {
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleEditUser = (userToEdit) => {
        setUserFormData({
            email: userToEdit.email,
            fullName: userToEdit.fullName,
            address: userToEdit.address || '',
            age: userToEdit.age || '',
            role: userToEdit.role,
            password: '',
            confirmPassword: ''
        });
        setSelectedUser(userToEdit);
        setOpenUserDialog(true);
    };

    const handleUpdateUser = async () => {
        try {
            if (!selectedUser) return;

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

            await academic.updateUser(selectedUser.id, updateData);
            await loadUsers();
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
                await loadUsers();
                setSuccess('User deleted successfully');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete user');
            } finally {
                setLoading(false);
            }
        }
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'admin':
                return '#d32f2f'; // red
            case 'teacher':
                return '#1976d2'; // blue
            case 'student':
                return '#388e3c'; // green
            default:
                return '#757575'; // grey
        }
    };

    return (
        <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: { xs: 1, sm: 2, md: 3 } }}>
            <Typography variant="h5" gutterBottom>User Management</Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Paper style={{
                overflow: 'scroll',
                maxHeight: '80vh'
            }}>
                <List>
                    {users.map((userData) => (
                        <React.Fragment key={userData.id}>
                            <ListItem>
                                <ListItemText
                                    primary={userData.fullName}
                                    secondary={
                                        <>
                                            <Typography
                                                component="span"
                                                variant="body2"
                                                // color="textPrimary"
                                                style={{ 
                                                    color: getRoleColor(userData.role) ,
                                                    backgroundColor: `${getRoleColor(userData.role)}22`,
                                                    padding: '2px 6px',
                                                    borderRadius: '40px',
                                                    fontSize: '0.65rem',
                                                    fontWeight: '600',
                                                    letterSpacing: '0.75px',
                                                    border: `1px dashed ${getRoleColor(userData.role)}`
                                                }}
                                            >
                                                {userData.role.toUpperCase()}
                                            </Typography>
                                            <div style={{marginTop: '6px'}}>
                                                {`Email: ${userData.email} • Age: ${userData.age || 'N/A'}`}
                                                {userData.address && ` • Address: ${userData.address}`}
                                            </div>
                                        </>
                                    }
                                />
                                {user.role === 'admin' && (
                                    <ListItemSecondaryAction>
                                        <IconButton
                                            edge="end"
                                            onClick={() => handleEditUser(userData)}
                                            sx={{ mr: 1 }}
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            edge="end"
                                            onClick={() => handleDeleteUser(userData.id)}
                                            color="error"
                                            disabled={userData.id === user.id}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                )}
                            </ListItem>
                            <Divider />
                        </React.Fragment>
                    ))}
                </List>
            </Paper>

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
                            SelectProps={{ native: true }}
                            disabled={selectedUser?.id === user.id}
                        >
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                            <option value="admin">Admin</option>
                        </TextField>

                        <Divider />
                        <Typography variant="subtitle2" color="textSecondary">
                            Change Password (Optional)
                        </Typography>

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