import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#000000', // Черный цвет для основной палитры
    },
    secondary: {
      main: '#3258a8', // Синий цвет для второстепенной палитры
    },
    background: {
      default: '#000000',  // Черный фон для всего приложения
      paper: '#1a1a1a', // Серый цвет для контейнеров, если необходимо
    },
    text: {
      primary: '#ffffff', // Белый цвет для текста
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          color: '#ffffff',  // Белый цвет для текста на кнопках
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#1a1a1a', // Серый фон для компонентов Paper
        },
      },
    },
  },
});

export default theme;
