module.exports = (app, redisClient, authMiddleware) => {
    // Get all students (admin only)
    app.get('/api/academic/students', authMiddleware, async (req, res) => {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Only admins can access student list' });
            }

            const userKeys = await redisClient.getAllData();
            const students = userKeys
                .filter((e) => typeof e.key === 'string' && e.key.startsWith('user:'))
                .map((e) => ({ ...(e.value || {}), key: e.key }))
                .filter((v) => v != null);

            console.log('🍬🍬🍬userKeys:', userKeys);
            console.log('❤️❤️❤️Fetched students:', students);
            res.json(students);
        } catch (error) {
            console.error('Students fetch error:', error);
            res.status(500).json({ message: 'Failed to fetch students' });
        }
    });

    // Get student grades (admin or self)
    app.get('/api/academic/students/:studentId/grades', authMiddleware, async (req, res) => {
        try {
            const { studentId } = req.params;

            // Check permissions
            if (req.user.role !== 'admin' && req.user.id !== studentId) {
                return res.status(403).json({ message: 'Unauthorized access to grades' });
            }

            const grades = await redisClient.get(`units:${studentId}`, 'json') || [];
            res.json(grades);
        } catch (error) {
            console.error('Grades fetch error:', error);
            res.status(500).json({ message: 'Failed to fetch grades' });
        }
    });

    // Add subject for student (admin only)
    app.post('/api/academic/students/:studentId/subjects', authMiddleware, async (req, res) => {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Only admins can add subjects' });
            }

            const { studentId } = req.params;
            const { subjectName } = req.body;

            // Get current units
            const units = await redisClient.get(`units:${studentId}`, 'json') || [];

            // Check if subject already exists
            if (units.some(unit => unit.subjectName === subjectName)) {
                return res.status(400).json({ message: 'Subject already exists' });
            }

            // Create new subject with empty grades
            const newSubject = {
                subjectName,
                grades: {
                    firstGrading: null,
                    secondGrading: null,
                    thirdGrading: null,
                    fourthGrading: null
                },
                average: null
            };

            units.push(newSubject);

            // Save updated units
            await redisClient.set(`units:${studentId}`, units, 'json');

            res.status(201).json({
                message: 'Subject added successfully',
                subject: newSubject
            });
        } catch (error) {
            console.error('Subject add error:', error);
            res.status(500).json({ message: 'Failed to add subject' });
        }
    });

    // Update student grades (admin only)
    app.put('/api/academic/students/:studentId/subjects/:subjectName/grades', authMiddleware, async (req, res) => {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Only admins can update grades' });
            }

            const { studentId, subjectName } = req.params;
            const { firstGrading, secondGrading, thirdGrading, fourthGrading } = req.body;

            // Get current units
            const units = await redisClient.get(`units:${studentId}`, 'json') || [];

            // Find and update subject grades
            const subjectIndex = units.findIndex(unit => unit.subjectName === subjectName);
            if (subjectIndex === -1) {
                return res.status(404).json({ message: 'Subject not found' });
            }

            // Update grades
            units[subjectIndex].grades = {
                firstGrading: firstGrading !== undefined ? firstGrading : units[subjectIndex].grades.firstGrading,
                secondGrading: secondGrading !== undefined ? secondGrading : units[subjectIndex].grades.secondGrading,
                thirdGrading: thirdGrading !== undefined ? thirdGrading : units[subjectIndex].grades.thirdGrading,
                fourthGrading: fourthGrading !== undefined ? fourthGrading : units[subjectIndex].grades.fourthGrading
            };

            // Calculate average (excluding null grades)
            const validGrades = Object.values(units[subjectIndex].grades).filter(grade => grade !== null);
            units[subjectIndex].average = validGrades.length > 0
                ? validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length
                : null;

            // Save updated units
            await redisClient.set(`units:${studentId}`, units, 'json');

            res.json({
                message: 'Grades updated successfully',
                subject: units[subjectIndex]
            });
        } catch (error) {
            console.error('Grades update error:', error);
            res.status(500).json({ message: 'Failed to update grades' });
        }
    });

    // Delete student subject (admin only)
    app.delete('/api/academic/students/:studentId/subjects/:subjectName', authMiddleware, async (req, res) => {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Only admins can delete subjects' });
            }

            const { studentId, subjectName } = req.params;

            // Get current units
            const units = await redisClient.get(`units:${studentId}`, 'json') || [];

            // Remove subject
            const updatedUnits = units.filter(unit => unit.subjectName !== subjectName);

            // Check if subject was found and removed
            if (updatedUnits.length === units.length) {
                return res.status(404).json({ message: 'Subject not found' });
            }

            // Save updated units
            await redisClient.set(`units:${studentId}`, updatedUnits, 'json');

            res.json({ message: 'Subject deleted successfully' });
        } catch (error) {
            console.error('Subject delete error:', error);
            res.status(500).json({ message: 'Failed to delete subject' });
        }
    });
};