import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#4F46E5', // Modern Indigo
            light: '#6366F1',
            dark: '#4338CA',
            contrastText: '#FFFFFF',
        },
        secondary: {
            main: '#7C3AED', // Violet
            light: '#8B5CF6',
            dark: '#6D28D9',
            contrastText: '#FFFFFF',
        },
        background: {
            default: '#F8FAFC', // Slate 50
            paper: '#FFFFFF',
        },
        text: {
            primary: '#0F172A',
            secondary: '#475569',
        },
        error: { main: '#EF4444', light: '#FEE2E2' },
        warning: { main: '#F59E0B', light: '#FEF3C7' },
        info: { main: '#3B82F6', light: '#DBEAFE' },
        success: { main: '#10B981', light: '#D1FAE5' },
    },
    typography: {
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        h1: { fontWeight: 800, letterSpacing: '-0.025em' },
        h2: { fontWeight: 800, letterSpacing: '-0.02em' },
        h3: { fontWeight: 700, letterSpacing: '-0.02em' },
        h4: { fontWeight: 700, letterSpacing: '-0.01em' },
        h5: { fontWeight: 700 },
        h6: { fontWeight: 600 },
        button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
    },
    shape: {
        borderRadius: 14,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    padding: '8px 18px',
                    boxShadow: 'none',
                    fontWeight: 600,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.3)',
                    },
                    '&:active': {
                        transform: 'translateY(0)',
                    },
                },
                containedPrimary: {
                    background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                },
                containedSecondary: {
                    background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',
                }
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                    '&:hover': {
                        boxShadow: '0 10px 25px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04)',
                    }
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundImage: 'none',
                    background: 'linear-gradient(160deg, #312e81 0%, #3730a3 40%, #4338ca 100%)',
                    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                    '& .MuiListItemText-primary': {
                        color: '#F8FAFC !important',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                    },
                    '& .MuiListItemIcon-root': {
                        color: '#94A3B8 !important',
                    },
                    '& .Mui-selected .MuiListItemIcon-root': {
                        color: '#818CF8 !important',
                    },
                    '& .MuiTypography-root': {
                        color: '#F8FAFC',
                    },
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                head: {
                    fontWeight: 700,
                    backgroundColor: '#F8FAFC',
                    color: '#475569',
                    fontSize: '0.825rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '2px solid #E2E8F0',
                },
                body: {
                    fontSize: '0.875rem',
                    color: '#1E293B',
                }
            }
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 600,
                    borderRadius: 8,
                }
            }
        }
    },
});

export default theme;
