module.exports = (app, redisClient, authMiddleware) => {
    // Get organization chart
    app.get('/api/organization', authMiddleware, async (req, res) => {
        try {
            const orgChart = await redisClient.get('organization:chart', 'json') || [];
            res.json(orgChart);
        } catch (error) {
            console.error('Organization chart fetch error:', error);
            res.status(500).json({ message: 'Failed to fetch organization chart' });
        }
    });

    // Add new organization member (admin only)
    app.post('/api/organization', authMiddleware, async (req, res) => {
        try {
            const { name, description, role, department, tenurityYears } = req.body;

            // In a real app, check if user is admin
            // if (!req.user.isAdmin) {
            //     return res.status(403).json({ message: 'Only admins can add members' });
            // }

            // Get current organization chart
            const orgChart = await redisClient.get('organization:chart', 'json') || [];

            // Create new member
            const newMember = {
                id: `member_${Date.now()}`,
                name,
                description,
                role,
                department,
                tenurityYears,
                createdAt: new Date().toISOString()
            };

            orgChart.push(newMember);

            // Save updated organization chart
            await redisClient.set('organization:chart', orgChart, 'json');

            res.status(201).json({
                message: 'Member added successfully',
                member: newMember
            });
        } catch (error) {
            console.error('Member add error:', error);
            res.status(500).json({ message: 'Failed to add member' });
        }
    });

    // Update organization member (admin only)
    app.put('/api/organization/:memberId', authMiddleware, async (req, res) => {
        try {
            const { memberId } = req.params;
            const { name, description, role, department, tenurityYears } = req.body;

            // In a real app, check if user is admin
            // if (!req.user.isAdmin) {
            //     return res.status(403).json({ message: 'Only admins can update members' });
            // }

            // Get current organization chart
            const orgChart = await redisClient.get('organization:chart', 'json') || [];

            // Find and update the member
            const memberIndex = orgChart.findIndex(member => member.id === memberId);
            if (memberIndex === -1) {
                return res.status(404).json({ message: 'Member not found' });
            }

            // Update member
            orgChart[memberIndex] = {
                ...orgChart[memberIndex],
                name: name || orgChart[memberIndex].name,
                description: description || orgChart[memberIndex].description,
                role: role || orgChart[memberIndex].role,
                department: department || orgChart[memberIndex].department,
                tenurityYears: tenurityYears || orgChart[memberIndex].tenurityYears,
                updatedAt: new Date().toISOString()
            };

            // Save updated organization chart
            await redisClient.set('organization:chart', orgChart, 'json');

            res.json({
                message: 'Member updated successfully',
                member: orgChart[memberIndex]
            });
        } catch (error) {
            console.error('Member update error:', error);
            res.status(500).json({ message: 'Failed to update member' });
        }
    });

    // Delete organization member (admin only)
    app.delete('/api/organization/:memberId', authMiddleware, async (req, res) => {
        try {
            const { memberId } = req.params;

            // In a real app, check if user is admin
            // if (!req.user.isAdmin) {
            //     return res.status(403).json({ message: 'Only admins can delete members' });
            // }

            // Get current organization chart
            const orgChart = await redisClient.get('organization:chart', 'json') || [];

            // Remove member
            const updatedOrgChart = orgChart.filter(member => member.id !== memberId);

            // Check if member was found and removed
            if (updatedOrgChart.length === orgChart.length) {
                return res.status(404).json({ message: 'Member not found' });
            }

            // Save updated organization chart
            await redisClient.set('organization:chart', updatedOrgChart, 'json');

            res.json({
                message: 'Member deleted successfully'
            });
        } catch (error) {
            console.error('Member delete error:', error);
            res.status(500).json({ message: 'Failed to delete member' });
        }
    });

    // Get members by department
    app.get('/api/organization/department/:department', authMiddleware, async (req, res) => {
        try {
            const { department } = req.params;
            
            // Get current organization chart
            const orgChart = await redisClient.get('organization:chart', 'json') || [];

            // Filter members by department
            const departmentMembers = orgChart.filter(
                member => member.department.toLowerCase() === department.toLowerCase()
            );

            res.json(departmentMembers);
        } catch (error) {
            console.error('Department members fetch error:', error);
            res.status(500).json({ message: 'Failed to fetch department members' });
        }
    });
};