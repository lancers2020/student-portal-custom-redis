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
    { type: 'like', icon: <ThumbUp fontSize="small" />, color: 'primary' },
    { type: 'love', icon: <Favorite fontSize="small" />, color: 'error' },
    { type: 'celebrate', icon: <Celebration fontSize="small" />, color: 'success' }
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

    /**
     * Helper function to group and count reactions
     * @param {Array} reactions - The raw array of reactions from the post object
     * @returns {Object} - An object with reaction types as keys and counts as values
     */
    const getReactionCounts = (reactions) => {
        return reactions.reduce((acc, reaction) => {
            acc[reaction.type] = (acc[reaction.type] || 0) + 1;
            return acc;
        }, {});
    };

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
            {user?.role === 'admin' && (
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
            )}

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Grid container spacing={3}>
                {posts.map((post) => {
                    const counts = getReactionCounts(post.reactions);
                    // Find the reaction the current user has, if any
                    const currentUserReaction = post.reactions.find(r => r.userId === user?.id);

                    return (
                        <Grid item xs={12} key={post.id}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Typography variant="h6">{post.title}</Typography>
                                        {user?.id === post.author && (
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDeletePost(post.id)}
                                                aria-label="Delete post"
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                    </Box>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mb: 2 }}
                                    >
                                        {/* post.authorName */}
                                        Posted **{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}** by **{post.author || 'Admin'}** 
                                    </Typography>
                                    <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
                                        {post.content}
                                    </Typography>

                                    {/* 🌟 REACTION DISPLAY FIX 🌟 */}
                                    <Divider sx={{ my: 2 }} />
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {reactionTypes.map((typeObj) => {
                                            const count = counts[typeObj.type] || 0;
                                            if (count === 0) return null;

                                            return (
                                                <Chip
                                                    key={typeObj.type}
                                                    icon={typeObj.icon}
                                                    label={`${count}`} // Display the count
                                                    color={typeObj.color}
                                                    size="small"
                                                    variant={currentUserReaction?.type === typeObj.type ? 'filled' : 'outlined'} // Highlight if current user reacted
                                                    
                                                    // Only allow delete if the count is from the current user's type
                                                    onDelete={
                                                        currentUserReaction?.type === typeObj.type
                                                            ? () => handleRemoveReaction(post.id)
                                                            : undefined
                                                    }
                                                    deleteIcon={currentUserReaction?.type === typeObj.type ? <DeleteIcon /> : undefined}
                                                />
                                            );
                                        })}
                                    </Box>
                                </CardContent>
                                
                                <CardActions sx={{ borderTop: '1px solid #eee', pt: 1 }}>
                                    {reactionTypes.map((reaction) => (
                                        <Button
                                            key={reaction.type}
                                            size="small"
                                            startIcon={reaction.icon}
                                            color={reaction.color}
                                            onClick={() => handleReaction(post.id, reaction.type)}
                                            // Disable button if user has already reacted (any type)
                                            disabled={!!currentUserReaction} 
                                            // Highlight if this specific type is the user's current reaction
                                            variant={currentUserReaction?.type === reaction.type ? 'contained' : 'text'}
                                        >
                                            {reaction.type.toUpperCase()}
                                        </Button>
                                    ))}
                                </CardActions>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            {/* Create Post Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="sm">
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
                        variant="outlined"
                    />
                    <TextField
                        fullWidth
                        label="Content"
                        multiline
                        rows={6} // Increased rows for better content editing
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        variant="outlined"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)} color="inherit">Cancel</Button>
                    <Button onClick={handleAddPost} disabled={loading} variant="contained">
                        {loading ? 'Creating...' : 'Create Post'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Timeline;