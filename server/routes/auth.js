module.exports = (app, redisClient, bcrypt, jwt, JWT_SECRET) => {
    // Register
    app.post('/api/auth/register', async (req, res) => {
        try {
            const { email, password, fullName, address, age, role } = req.body;

            // Check if user exists
            const existingUser = await redisClient.get(`email:${email}`, 'string');
            if (existingUser) {
                return res.status(400).json({ message: 'Email already registered' });
            }

            // Generate unique ID
            const userId = `user_${Date.now()}`;
            
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Default role to student if not provided
            const userRole = role === 'admin' ? 'admin' : 'student';

            // Create user profile
            const user = {
                id: userId,
                email,
                fullName,
                address,
                age,
                role: userRole,
                themeColor: '#1a73e8', // default theme color
                classmates: [],
                avatar: {
                    nose: 'default',
                    eyes: 'default',
                    lips: 'default',
                    hair: 'default'
                }
            };

            console.log('✅✅✅Registering new user:', user);

            // Store user data
            await redisClient.set(`user:${userId}`, user, 'json');
            await redisClient.set(`email:${email}`, userId);
            await redisClient.set(`auth:${userId}`, hashedPassword);

            // Create empty notebook
            await redisClient.set(`notebook:${userId}`, { sheets: [] }, 'json');

            // Seed dummy organization chart if not present
            const orgExists = await redisClient.get('organization:chart', 'json');
            if (!orgExists) {
                const dummyOrg = [
                    {
                        id: 'member_1',
                        name: 'Dr. Alice Smith',
                        // REVISED DESCRIPTION
                        description: 'Chief Executive and Strategic Lead for University Governance and Planning.',
                        role: 'President',
                        department: 'Administration',
                        tenurityYears: 10,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'member_2',
                        name: 'Prof. Bob Johnson',
                        // REVISED DESCRIPTION
                        description: 'Oversees academic programs, research initiatives, and faculty development within the School of Engineering.',
                        role: 'Dean',
                        department: 'Engineering',
                        tenurityYears: 7,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'member_3',
                        name: 'Ms. Carol Lee',
                        // REVISED DESCRIPTION
                        description: 'Manages student academic records, course registration, and graduation processes.',
                        role: 'Registrar',
                        department: 'Administration',
                        tenurityYears: 5,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'member_4',
                        name: 'Dr. David Kim',
                        // REVISED DESCRIPTION
                        description: 'Senior Lecturer specializing in theoretical physics and curriculum development.',
                        role: 'Faculty',
                        department: 'Science',
                        tenurityYears: 3,
                        createdAt: new Date().toISOString()
                    }
                ];
                await redisClient.set('organization:chart', dummyOrg, 'json');
            }

            // Generate JWT
            const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '24h' });

            res.status(201).json({
                message: 'Registration successful',
                token,
                user
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ message: 'Registration failed' });
        }
    });

    // Login
    app.post('/api/auth/login', async (req, res) => {
        try {
            const { email, password } = req.body;

            // Get user ID by email
            const userId = await redisClient.get(`email:${email}`, 'string');
            if (!userId) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Get password hash
            const hashedPassword = await redisClient.get(`auth:${userId}`, 'string');
            
            // Compare passwords
            const isValid = await bcrypt.compare(password, hashedPassword);
            if (!isValid) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Get user data
            const user = await redisClient.get(`user:${userId}`, 'json');

            // Generate JWT
            const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '24h' });

            res.json({
                message: 'Login successful',
                token,
                user
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Login failed' });
        }
    });

    // Change Password
    app.put('/api/auth/password', async (req, res) => {
        try {
            const { email, oldPassword, newPassword } = req.body;

            // Get user ID by email
            const userId = await redisClient.get(`email:${email}`, 'string');
            if (!userId) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Get current password hash
            const currentHash = await redisClient.get(`auth:${userId}`, 'string');
            
            // Verify old password
            const isValid = await bcrypt.compare(oldPassword, currentHash);
            if (!isValid) {
                return res.status(401).json({ message: 'Invalid password' });
            }

            // Hash new password
            const newHash = await bcrypt.hash(newPassword, 10);
            
            // Update password
            await redisClient.set(`auth:${userId}`, newHash);

            res.json({ message: 'Password updated successfully' });
        } catch (error) {
            console.error('Password change error:', error);
            res.status(500).json({ message: 'Password change failed' });
        }
    });
};