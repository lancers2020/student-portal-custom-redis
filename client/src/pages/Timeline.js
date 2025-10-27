import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    CardActions,
    Button,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Alert,
    Grid,
    Chip,
    Avatar,
    Divider
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    ThumbUp,
    Favorite,
    Celebration
} from '@mui/icons-material';
import { timeline } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const reactionTypes = [
    { type: 'like', icon: <ThumbUp />, color: 'primary' },
    { type: 'love', icon: <Favorite />, color: 'error' },
    { type: 'celebrate', icon: <Celebration />, color: 'success' }
];

const Timeline = () => {
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        content: ''
    });

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        try {
            const response = await timeline.getPosts();
            setPosts(response.data);
        } catch (err) {
            setError('Failed to load posts');
        }
    };

    const handleAddPost = async () => {
        try {
            setLoading(true);
            setError('');
            await timeline.createPost(formData);
            await loadPosts();
            setOpenDialog(false);
            setFormData({ title: '', content: '' });
            setSuccess('Post created successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create post');
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePost = async (postId) => {
        if (window.confirm('Are you sure you want to delete this post?')) {
            try {
                setLoading(true);
                setError('');
                await timeline.deletePost(postId);
                await loadPosts();
                setSuccess('Post deleted successfully');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete post');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleReaction = async (postId, reactionType) => {
        try {
            setLoading(true);
            setError('');
            await timeline.addReaction(postId, { type: reactionType });
            await loadPosts();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add reaction');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveReaction = async (postId) => {
        try {
            setLoading(true);
            setError('');
            await timeline.removeReaction(postId);
            await loadPosts();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to remove reaction');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5">University Timeline</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenDialog(true)}
                >
                    Create Post
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Grid container spacing={3}>
                {posts.map((post) => (
                    <Grid item xs={12} key={post.id}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                    <Typography variant="h6">{post.title}</Typography>
                                    {user.id === post.author && (
                                        <IconButton
                                            size="small"
                                            onClick={() => handleDeletePost(post.id)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    )}
                                </Box>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mb: 2 }}
                                >
                                    Posted {formatDistanceToNow(new Date(post.createdAt))} ago
                                </Typography>
                                <Typography variant="body1" paragraph>
                                    {post.content}
                                </Typography>
                                <Divider sx={{ my: 2 }} />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {post.reactions.map((reaction, index) => (
                                        <Chip
                                            key={index}
                                            icon={reactionTypes.find(r => r.type === reaction.type)?.icon}
                                            label={reaction.type}
                                            color={reactionTypes.find(r => r.type === reaction.type)?.color}
                                            size="small"
                                            onDelete={
                                                reaction.userId === user.id
                                                    ? () => handleRemoveReaction(post.id)
                                                    : undefined
                                            }
                                        />
                                    ))}
                                </Box>
                            </CardContent>
                            <CardActions>
                                {reactionTypes.map((reaction) => (
                                    <Button
                                        key={reaction.type}
                                        size="small"
                                        startIcon={reaction.icon}
                                        color={reaction.color}
                                        onClick={() => handleReaction(post.id, reaction.type)}
                                        disabled={post.reactions.some(r => r.userId === user.id)}
                                    >
                                        {reaction.type}
                                    </Button>
                                ))}
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Create Post Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>Create New Post</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Title"
                        fullWidth
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        label="Content"
                        multiline
                        rows={4}
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddPost} disabled={loading}>
                        {loading ? 'Creating...' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Timeline;