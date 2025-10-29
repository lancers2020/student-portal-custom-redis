module.exports = (app, redisClient, authMiddleware) => {
    // Get teacher's classes
    app.get('/api/classes', authMiddleware, async (req, res) => {
        try {
            if (req.user.role !== 'teacher') {
                return res.status(403).json({ message: 'Only teachers can access class list' });
            }

            const classes = await redisClient.get(`teacher:${req.user.id}:classes`, 'json') || [];
            
            // Get full student details for each class
            const classesWithDetails = await Promise.all(classes.map(async (classData) => {
                const students = await Promise.all(
                    classData.students.map(async (studentId) => {
                        const studentData = await redisClient.get(`user:${studentId}`, 'json');
                        return studentData || { id: studentId, fullName: 'Unknown Student' };
                    })
                );
                return { ...classData, students };
            }));

            res.json(classesWithDetails);
        } catch (error) {
            console.error('Classes fetch error:', error);
            res.status(500).json({ message: 'Failed to fetch classes' });
        }
    });

    // Create new class
    app.post('/api/classes', authMiddleware, async (req, res) => {
        try {
            if (req.user.role !== 'teacher') {
                return res.status(403).json({ message: 'Only teachers can create classes' });
            }

            const { name, subjects, students } = req.body;

            // Generate unique ID for the class
            const classId = `class_${Date.now()}`;

            // Create class object
            const newClass = {
                id: classId,
                name,
                subjects,
                students: students.map(s => s.id),
                teacherId: req.user.id,
                createdAt: new Date().toISOString()
            };

            // Get current classes for the teacher
            const classes = await redisClient.get(`teacher:${req.user.id}:classes`, 'json') || [];
            
            // Add new class
            classes.push(newClass);

            // Save updated classes
            await redisClient.set(`teacher:${req.user.id}:classes`, classes, 'json');

            // Add class reference to each student's data
            for (const student of students) {
                const studentClasses = await redisClient.get(`student:${student.id}:classes`, 'json') || [];
                studentClasses.push(classId);
                await redisClient.set(`student:${student.id}:classes`, studentClasses, 'json');
            }

            res.status(201).json({
                message: 'Class created successfully',
                class: newClass
            });
        } catch (error) {
            console.error('Class creation error:', error);
            res.status(500).json({ message: 'Failed to create class' });
        }
    });

    // Update class students
    app.put('/api/classes/:classId/students', authMiddleware, async (req, res) => {
        try {
            if (req.user.role !== 'teacher') {
                return res.status(403).json({ message: 'Only teachers can update class students' });
            }

            const { classId } = req.params;
            const { students } = req.body;

            // Get teacher's classes
            const classes = await redisClient.get(`teacher:${req.user.id}:classes`, 'json') || [];
            
            // Find the class
            const classIndex = classes.findIndex(c => c.id === classId);
            if (classIndex === -1) {
                return res.status(404).json({ message: 'Class not found' });
            }

            // Get current student list for cleanup
            const currentStudents = classes[classIndex].students;

            // Remove class reference from students who are being removed
            const removedStudents = currentStudents.filter(id => !students.find(s => s.id === id));
            for (const studentId of removedStudents) {
                const studentClasses = await redisClient.get(`student:${studentId}:classes`, 'json') || [];
                const updatedClasses = studentClasses.filter(id => id !== classId);
                await redisClient.set(`student:${studentId}:classes`, updatedClasses, 'json');
            }

            // Add class reference to new students
            const newStudents = students.filter(s => !currentStudents.includes(s.id));
            for (const student of newStudents) {
                const studentClasses = await redisClient.get(`student:${student.id}:classes`, 'json') || [];
                if (!studentClasses.includes(classId)) {
                    studentClasses.push(classId);
                    await redisClient.set(`student:${student.id}:classes`, studentClasses, 'json');
                }
            }

            // Update class with new student list
            classes[classIndex].students = students.map(s => s.id);
            await redisClient.set(`teacher:${req.user.id}:classes`, classes, 'json');

            res.json({
                message: 'Class students updated successfully',
                class: classes[classIndex]
            });
        } catch (error) {
            console.error('Class students update error:', error);
            res.status(500).json({ message: 'Failed to update class students' });
        }
    });

    // Delete class
    app.delete('/api/classes/:classId', authMiddleware, async (req, res) => {
        try {
            if (req.user.role !== 'teacher') {
                return res.status(403).json({ message: 'Only teachers can delete classes' });
            }

            const { classId } = req.params;

            // Get teacher's classes
            const classes = await redisClient.get(`teacher:${req.user.id}:classes`, 'json') || [];
            
            // Find the class to delete
            const classToDelete = classes.find(c => c.id === classId);
            if (!classToDelete) {
                return res.status(404).json({ message: 'Class not found' });
            }

            // Remove class reference from all students
            for (const studentId of classToDelete.students) {
                const studentClasses = await redisClient.get(`student:${studentId}:classes`, 'json') || [];
                const updatedClasses = studentClasses.filter(id => id !== classId);
                await redisClient.set(`student:${studentId}:classes`, updatedClasses, 'json');
            }

            // Remove class from teacher's classes
            const updatedClasses = classes.filter(c => c.id !== classId);
            await redisClient.set(`teacher:${req.user.id}:classes`, updatedClasses, 'json');

            res.json({ message: 'Class deleted successfully' });
        } catch (error) {
            console.error('Class deletion error:', error);
            res.status(500).json({ message: 'Failed to delete class' });
        }
    });

    // Get all unassigned students (for teacher's class management)
    app.get('/api/students/all', authMiddleware, async (req, res) => {
        try {
            if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Unauthorized access' });
            }

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
};