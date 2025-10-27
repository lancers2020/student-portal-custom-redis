module.exports = (app, redisClient, authMiddleware) => {
    // Get timeline posts
    app.get('/api/timeline', authMiddleware, async (req, res) => {
        try {
            const posts = await redisClient.get('timeline:posts', 'json') || [];
            
            // Get reactions for each post
            const postsWithReactions = await Promise.all(posts.map(async (post) => {
                const reactions = await redisClient.get(`timeline:reactions:${post.id}`, 'json') || [];
                return { ...post, reactions };
            }));

            res.json(postsWithReactions);
        } catch (error) {
            console.error('Timeline fetch error:', error);
            res.status(500).json({ message: 'Failed to fetch timeline' });
        }
    });

    // Add new post (admin only)
    app.post('/api/timeline', authMiddleware, async (req, res) => {
        try {
            const { title, content } = req.body;
            
            // In a real app, check if user is admin
            // if (!req.user.isAdmin) {
            //     return res.status(403).json({ message: 'Only admins can create posts' });
            // }

            // Get current posts
            const posts = await redisClient.get('timeline:posts', 'json') || [];

            // Create new post
            const newPost = {
                id: `post_${Date.now()}`,
                title,
                content,
                createdAt: new Date().toISOString(),
                author: req.user.id
            };

            posts.unshift(newPost); // Add to beginning of array

            // Save updated posts
            await redisClient.set('timeline:posts', posts, 'json');

            // Initialize empty reactions for the post
            await redisClient.set(`timeline:reactions:${newPost.id}`, [], 'json');

            res.status(201).json({
                message: 'Post created successfully',
                post: newPost
            });
        } catch (error) {
            console.error('Post creation error:', error);
            res.status(500).json({ message: 'Failed to create post' });
        }
    });

    // React to post
    app.post('/api/timeline/:postId/react', authMiddleware, async (req, res) => {
        try {
            const { postId } = req.params;
            const { type } = req.body; // e.g., 'like', 'love', 'celebrate'
            const userId = req.user.id;

            // Get current reactions for the post
            const reactions = await redisClient.get(`timeline:reactions:${postId}`, 'json') || [];

            // Check if user already reacted
            const existingReactionIndex = reactions.findIndex(
                reaction => reaction.userId === userId
            );

            if (existingReactionIndex !== -1) {
                // Update existing reaction
                reactions[existingReactionIndex].type = type;
            } else {
                // Add new reaction
                reactions.push({
                    userId,
                    type,
                    timestamp: new Date().toISOString()
                });
            }

            // Save updated reactions
            await redisClient.set(`timeline:reactions:${postId}`, reactions, 'json');

            res.json({
                message: 'Reaction added successfully',
                reactions
            });
        } catch (error) {
            console.error('Reaction add error:', error);
            res.status(500).json({ message: 'Failed to add reaction' });
        }
    });

    // Remove reaction from post
    app.delete('/api/timeline/:postId/react', authMiddleware, async (req, res) => {
        try {
            const { postId } = req.params;
            const userId = req.user.id;

            // Get current reactions for the post
            const reactions = await redisClient.get(`timeline:reactions:${postId}`, 'json') || [];

            // Remove user's reaction
            const updatedReactions = reactions.filter(
                reaction => reaction.userId !== userId
            );

            // Save updated reactions
            await redisClient.set(`timeline:reactions:${postId}`, updatedReactions, 'json');

            res.json({
                message: 'Reaction removed successfully',
                reactions: updatedReactions
            });
        } catch (error) {
            console.error('Reaction remove error:', error);
            res.status(500).json({ message: 'Failed to remove reaction' });
        }
    });

    // Delete post (admin only)
    app.delete('/api/timeline/:postId', authMiddleware, async (req, res) => {
        try {
            const { postId } = req.params;

            // In a real app, check if user is admin
            // if (!req.user.isAdmin) {
            //     return res.status(403).json({ message: 'Only admins can delete posts' });
            // }

            // Get current posts
            const posts = await redisClient.get('timeline:posts', 'json') || [];

            // Remove post
            const updatedPosts = posts.filter(post => post.id !== postId);

            // Save updated posts
            await redisClient.set('timeline:posts', updatedPosts, 'json');

            // Delete reactions for the post
            await redisClient.del(`timeline:reactions:${postId}`);

            res.json({
                message: 'Post deleted successfully'
            });
        } catch (error) {
            console.error('Post delete error:', error);
            res.status(500).json({ message: 'Failed to delete post' });
        }
    });
};