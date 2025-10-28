import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    Chip,
    Avatar
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
        <Box sx={{ width: '100%', maxWidth: 1000, mx: 'auto', px: { xs: 1, sm: 2, md: 3 }, py: { xs: 1, sm: 2, md: 3 } }}>
            <Typography variant="h4" gutterBottom sx={{ color: 'primary.dark', mb: 3 }}>
                Organization Chart
            </Typography>
            {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
            <Grid container spacing={2}>
                {members.map(member => (
                    <Grid item xs={12} sm={6} md={4} key={member.id}>
                        <Card>
                            <CardContent sx={{display: 'flex'}}>
                                <Avatar sx={{height: 100, width: 100, border: '2px solid #5C3E94'}}/>
                                <div>
                                    <Typography variant="h5" sx={{ ml: 2, mt: 2 }}>{member.name}</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                                        {member.role} - {member.department}
                                    </Typography>
                                </div>
                            </CardContent>
                            <CardContent>
                                <Typography variant="body2" sx={{ mb: 1 }}>{member.description}</Typography>
                                <Chip label={`Tenurity: ${member.tenurityYears} years`} color="primary" size="small" sx={{backgroundColor: '#5C3E94'}}/>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default Organization;