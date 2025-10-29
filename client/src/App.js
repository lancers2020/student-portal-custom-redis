import React, { useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import AppRouter from './AppRouter';

function ThemedApp() {
  const { user } = useAuth();
  
  const theme = useMemo(() => createTheme({
    palette: {
      primary: {
        main: user?.themeColor || '#1a73e8',
      },
      secondary: {
        main: '#7B1FA2',
      },
    },
  }), [user?.themeColor]);

  return (
    <ThemeProvider theme={theme}>
      <AppRouter />
    </ThemeProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemedApp />
    </AuthProvider>
  );
}

export default App;
