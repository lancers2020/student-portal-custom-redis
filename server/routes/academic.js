module.exports = (app, redisClient, authMiddleware) => {
    // Get all users (admin only)
    app.get('/api/academic/users', authMiddleware, async (req, res) => {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Only admins can access all users' });
            }

            const userKeys = await redisClient.getAllData();
            const users = userKeys
                .filter((e) => typeof e.key === 'string' && e.key.startsWith('user:'))
                .map((e) => ({ ...(e.value || {}), key: e.key }))
                .filter((v) => v != null);

            res.json(users);
        } catch (error) {
            console.error('Users fetch error:', error);
            res.status(500).json({ message: 'Failed to fetch users' });
        }
    });

    // Get all students (admin and teacher only)
    app.get('/api/academic/students', authMiddleware, async (req, res) => {
        try {
            if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
                return res.status(403).json({ message: 'Only admins and teachers can access student list' });
            }

            // const userKeys = await redisClient.getAllData();
            // const users = userKeys
            //     .filter((e) => typeof e.key === 'string' && e.key.startsWith('user:'))
            //     .map((e) => ({ ...(e.value || {}), key: e.key }))
            //     .filter((v) => v != null && v.role === 'student');

            // res.json(users);
            const allKeys = await redisClient.getAllData();
            
            // First, get all students
            const allStudents = allKeys
                .filter(data => {
                    const user = data.value;
                    return user && user.role === 'student';
                })
                .map(data => ({
                    id: data.value.id,
                    fullName: data.value.fullName,
                    email: data.value.email
                }));
                
            // Then, check which students are not assigned to any class
            const studentsWithoutClass = await Promise.all(
                allStudents.map(async (student) => {
                    const studentClasses = await redisClient.get(`student:${student.id}:classes`, 'json') || [];
                    // Only include students that have no classes
                    return studentClasses.length === 0 ? student : null;
                })
            );

            // Filter out null values and return only unassigned students
            const availableStudents = studentsWithoutClass.filter(student => student !== null);

            res.json(availableStudents);
        } catch (error) {
            console.error('Students fetch error:', error);
            res.status(500).json({ message: 'Failed to fetch students' });
        }
    });

    // Update user (admin only)
    app.put('/api/academic/users/:userId', authMiddleware, async (req, res) => {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Only admins can update user details' });
            }

            const { userId } = req.params;
            const updateData = req.body;

            // Get existing user data
            const existingUser = await redisClient.get(`user:${userId}`, 'json');
            if (!existingUser) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Hash password if provided
            if (updateData.password) {
                const bcrypt = require('bcryptjs');
                const salt = await bcrypt.genSalt(10);
                updateData.password = await bcrypt.hash(updateData.password, salt);
            }

            const isEmailExisting = await redisClient.get(`email:${updateData.email}`, 'string');
            if (isEmailExisting) {
                delete updateData.email;
            }

            // Update user data
            const updatedUser = {
                ...existingUser,
                ...updateData,
                id: userId
            };

            await redisClient.set(`user:${userId}`, updatedUser, 'json');
            await redisClient.set(`email:${updatedUser.email}`, userId, 'string');
            res.json({ message: 'User updated successfully' });
        } catch (error) {
            console.error('User update error:', error);
            res.status(500).json({ message: 'Failed to update user' });
        }
    });

    // Delete user (admin only)
    app.delete('/api/academic/users/:userId', authMiddleware, async (req, res) => {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Only admins can delete users' });
            }

            const { userId } = req.params;

            // Check if user exists
            const existingUser = await redisClient.get(`user:${userId}`, 'json');
            if (!existingUser) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Delete user data
            await redisClient.del(`user:${userId}`);
            // Also delete associated data like grades
            await redisClient.del(`units:${userId}`);
            // Delete auth and email mappings
            await redisClient.del(`auth:${userId}`);
            await redisClient.del(`email:${existingUser.email}`);

            res.json({ message: 'User deleted successfully' });
        } catch (error) {
            console.error('User delete error:', error);
            res.status(500).json({ message: `Failed to delete user, error: ${error}` });
        }
    });

    // Get student grades (admin or self)
    app.get('/api/academic/students/:studentId/grades', authMiddleware, async (req, res) => {
        try {
            const { studentId } = req.params;

            // Check permissions
            if (req.user.role !== 'admin' && req.user.id !== studentId && req.user.role !== 'teacher') {
                return res.status(403).json({ message: 'Unauthorized access to grades' });
            }

            const grades = await redisClient.get(`units:${studentId}`, 'json') || [];
            const withStudentId = grades.map(v => ({ ...v, studentId }));
            res.json(withStudentId);
        } catch (error) {
            console.error('Grades fetch error:', error);
            res.status(500).json({ message: 'Failed to fetch grades' });
        }
    });

    // Add subject for student (admins and teachers only)
    app.post('/api/academic/students/:studentId/subjects', authMiddleware, async (req, res) => {
        try {
            if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
                return res.status(403).json({ message: 'Only admins can add subjects' });
            }

            const { studentId } = req.params;
            const { subjectName, grades } = req.body;

            // Get current units
            const units = await redisClient.get(`units:${studentId}`, 'json') || [];

            // Check if subject already exists
            if (units.some(unit => unit.subjectName === subjectName)) {
                // return res.status(400).json({ message: 'Subject already exists' });
                return res.status(201).json({
                    message: 'Subject added successfully'
                });
            }

            // Create new subject with empty grades
            const avg = (grades.firstGrading + grades.secondGrading + grades.thirdGrading + grades.fourthGrading) / 4;
            const isCompleteGradingPeriods = Object.entries(grades).filter(([period, value]) => {
                return value != null;
            }).length == 4;
            const newSubject = {
                subjectName,
                grades: grades,
                average: isCompleteGradingPeriods ? avg : null
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
            if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
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