module.exports = (app, redisClient, authMiddleware) => {
    // Get user's notebook
    app.get('/api/notebook', authMiddleware, async (req, res) => {
        try {
            const userId = req.user.id;
            const notebook = await redisClient.get(`notebook:${userId}`, 'json') || { sheets: [] };
            res.json(notebook);
        } catch (error) {
            console.error('Notebook fetch error:', error);
            res.status(500).json({ message: 'Failed to fetch notebook' });
        }
    });

    // Add new sheet
    app.post('/api/notebook/sheets', authMiddleware, async (req, res) => {
        try {
            const { title } = req.body;
            const userId = req.user.id;

            // Get current notebook
            const notebook = await redisClient.get(`notebook:${userId}`, 'json') || { sheets: [] };

            // Check if sheet with same title exists
            if (notebook.sheets.some(sheet => sheet.title === title)) {
                return res.status(400).json({ message: 'Sheet with this title already exists' });
            }

            // Add new sheet
            const newSheet = {
                id: `sheet_${Date.now()}`,
                title,
                content: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            notebook.sheets.push(newSheet);

            // Save updated notebook
            await redisClient.set(`notebook:${userId}`, notebook, 'json');

            res.status(201).json({
                message: 'Sheet added successfully',
                sheet: newSheet
            });
        } catch (error) {
            console.error('Sheet add error:', error);
            res.status(500).json({ message: 'Failed to add sheet' });
        }
    });

    // Update sheet content
    app.put('/api/notebook/sheets/:sheetId', authMiddleware, async (req, res) => {
        try {
            const { sheetId } = req.params;
            const { content, title } = req.body;
            const userId = req.user.id;

            // Get current notebook
            const notebook = await redisClient.get(`notebook:${userId}`, 'json');
            if (!notebook) {
                return res.status(404).json({ message: 'Notebook not found' });
            }

            // Find and update the sheet
            const sheetIndex = notebook.sheets.findIndex(sheet => sheet.id === sheetId);
            if (sheetIndex === -1) {
                return res.status(404).json({ message: 'Sheet not found' });
            }

            // Update sheet
            notebook.sheets[sheetIndex] = {
                ...notebook.sheets[sheetIndex],
                title: title || notebook.sheets[sheetIndex].title,
                content: content !== undefined ? content : notebook.sheets[sheetIndex].content,
                updatedAt: new Date().toISOString()
            };

            // Save updated notebook
            await redisClient.set(`notebook:${userId}`, notebook, 'json');

            res.json({
                message: 'Sheet updated successfully',
                sheet: notebook.sheets[sheetIndex]
            });
        } catch (error) {
            console.error('Sheet update error:', error);
            res.status(500).json({ message: 'Failed to update sheet' });
        }
    });

    // Delete sheet
    app.delete('/api/notebook/sheets/:sheetId', authMiddleware, async (req, res) => {
        try {
            const { sheetId } = req.params;
            const userId = req.user.id;

            // Get current notebook
            const notebook = await redisClient.get(`notebook:${userId}`, 'json');
            if (!notebook) {
                return res.status(404).json({ message: 'Notebook not found' });
            }

            // Remove sheet
            notebook.sheets = notebook.sheets.filter(sheet => sheet.id !== sheetId);

            // Save updated notebook
            await redisClient.set(`notebook:${userId}`, notebook, 'json');

            res.json({
                message: 'Sheet deleted successfully'
            });
        } catch (error) {
            console.error('Sheet delete error:', error);
            res.status(500).json({ message: 'Failed to delete sheet' });
        }
    });
};