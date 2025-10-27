module.exports = (app, redisClient, authMiddleware) => {
    // Get user profile
    app.get('/api/profile', authMiddleware, async (req, res) => {
        try {
            res.json(req.user);
        } catch (error) {
            console.error('Profile fetch error:', error);
            res.status(500).json({ message: 'Failed to fetch profile' });
        }
    });

    // Update profile
    app.put('/api/profile', authMiddleware, async (req, res) => {
        try {
            const { fullName, address, age, themeColor, avatar } = req.body;
            const userId = req.user.id;

            // Get current user data
            const userData = await redisClient.get(`user:${userId}`, 'json');
            
            // Update fields
            const updatedUser = {
                ...userData,
                fullName: fullName || userData.fullName,
                address: address || userData.address,
                age: age || userData.age,
                themeColor: themeColor || userData.themeColor,
                avatar: avatar || userData.avatar
            };

            // Save updated user data
            await redisClient.set(`user:${userId}`, updatedUser, 'json');

            res.json({
                message: 'Profile updated successfully',
                user: updatedUser
            });
        } catch (error) {
            console.error('Profile update error:', error);
            res.status(500).json({ message: 'Failed to update profile' });
        }
    });

    // Update avatar
    app.put('/api/profile/avatar', authMiddleware, async (req, res) => {
        try {
            const { nose, eyes, lips, hair } = req.body;
            const userId = req.user.id;

            // Get current user data
            const userData = await redisClient.get(`user:${userId}`, 'json');
            
            // Update avatar
            userData.avatar = {
                nose: nose || userData.avatar.nose,
                eyes: eyes || userData.avatar.eyes,
                lips: lips || userData.avatar.lips,
                hair: hair || userData.avatar.hair
            };

            // Save updated user data
            await redisClient.set(`user:${userId}`, userData, 'json');

            res.json({
                message: 'Avatar updated successfully',
                avatar: userData.avatar
            });
        } catch (error) {
            console.error('Avatar update error:', error);
            res.status(500).json({ message: 'Failed to update avatar' });
        }
    });

    // Manage classmates
    app.put('/api/profile/classmates', authMiddleware, async (req, res) => {
        try {
            const { action, classmateId } = req.body;
            const userId = req.user.id;

            // Get current user data
            const userData = await redisClient.get(`user:${userId}`, 'json');
            
            if (action === 'add') {
                // Check if classmate exists
                const classmateData = await redisClient.get(`user:${classmateId}`, 'json');
                if (!classmateData) {
                    return res.status(404).json({ message: 'Classmate not found' });
                }

                // Add classmate if not already in list
                if (!userData.classmates.includes(classmateId)) {
                    userData.classmates.push(classmateId);
                }
            } else if (action === 'remove') {
                // Remove classmate from list
                userData.classmates = userData.classmates.filter(id => id !== classmateId);
            }

            // Save updated user data
            await redisClient.set(`user:${userId}`, userData, 'json');

            res.json({
                message: 'Classmates updated successfully',
                classmates: userData.classmates
            });
        } catch (error) {
            console.error('Classmates update error:', error);
            res.status(500).json({ message: 'Failed to update classmates' });
        }
    });

    // Get classmates details
    app.get('/api/profile/classmates', authMiddleware, async (req, res) => {
        try {
            const classmates = [];
            
            // Get details for each classmate
            for (const classmateId of req.user.classmates) {
                const classmateData = await redisClient.get(`user:${classmateId}`, 'json');
                if (classmateData) {
                    // Only send necessary information
                    classmates.push({
                        id: classmateData.id,
                        fullName: classmateData.fullName,
                        avatar: classmateData.avatar
                    });
                }
            }

            res.json(classmates);
        } catch (error) {
            console.error('Classmates fetch error:', error);
            res.status(500).json({ message: 'Failed to fetch classmates' });
        }
    });
};