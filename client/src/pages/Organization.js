import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    Chip
} from '@mui/material';
import { organization as orgApi } from '../services/api';

const Organization = () => {
    const [members, setMembers] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        loadOrgChart();
    }, []);

    const loadOrgChart = async () => {
        try {
            const response = await orgApi.getAll();
            setMembers(response.data);
        } catch (err) {
            setError('Failed to load organization chart');
        }
    };

    return (
        <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto', px: { xs: 1, sm: 2, md: 3 }, py: { xs: 1, sm: 2, md: 3 } }}>
            <Typography variant="h5" sx={{ mb: 3, fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>
                Organization Chart
            </Typography>
            {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
            <Grid container spacing={2}>
                {members.map(member => (
                    <Grid item xs={12} sm={6} md={4} key={member.id}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Typography variant="h6" sx={{ mb: 1 }}>{member.name}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    {member.role} - {member.department}
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>{member.description}</Typography>
                                <Chip label={`Tenurity: ${member.tenurityYears} years`} color="primary" size="small" />
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default Organization;