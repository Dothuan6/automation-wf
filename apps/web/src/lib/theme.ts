import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: { main: '#1A73E8', contrastText: '#fff' },
    secondary: { main: '#5F6368' },
    success: { main: '#1E8E3E' },
    warning: { main: '#F9AB00' },
    error: { main: '#D93025' },
    info: { main: '#1A73E8' },
    background: { default: '#F8F9FA', paper: '#FFFFFF' },
    text: { primary: '#202124', secondary: '#5F6368' },
    divider: '#DADCE0',
  },
  typography: {
    fontFamily: "'Be Vietnam Pro', 'Inter', system-ui, sans-serif",
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    h1: { fontSize: '28px', lineHeight: '36px', fontWeight: 600 },
    h2: { fontSize: '22px', lineHeight: '28px', fontWeight: 600 },
    h3: { fontSize: '16px', lineHeight: '24px', fontWeight: 600 },
    body1: { fontSize: '14px', lineHeight: '20px' },
    body2: { fontSize: '13px', lineHeight: '18px' },
    caption: { fontSize: '12px', lineHeight: '16px' },
  },
  shape: { borderRadius: 8 },
  spacing: 4,
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 500, borderRadius: 8 },
        contained: { boxShadow: 'none', '&:hover': { boxShadow: '0 1px 2px rgba(0,0,0,0.06)' } },
      },
      defaultProps: { disableElevation: true },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.06)', border: '1px solid #DADCE0' },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 4 } },
    },
    MuiTableCell: {
      styleOverrides: { root: { padding: '8px 12px', fontSize: '14px' } },
    },
    MuiInputBase: {
      styleOverrides: { root: { fontSize: '14px' } },
    },
  },
});

export const darkTheme = createTheme({
  ...theme,
  palette: {
    mode: 'dark',
    primary: { main: '#8AB4F8' },
    background: { default: '#202124', paper: '#28292C' },
    text: { primary: '#E8EAED', secondary: '#9AA0A6' },
    divider: '#3C4043',
  },
});
