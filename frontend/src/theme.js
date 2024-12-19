import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#000000', // Черный цвет для основной палитры
    },
    secondary: {
      main: '#25ea2e', // Синий цвет для второстепенной палитры
    },
    background: {
      default: '#000000',  // Черный фон для всего приложения
      paper: '#2a2a2a', // Серый цвет для контейнеров, если необходимо
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
          borderRadius: '12px',
          width: '100%',
          color: '#ffffff',  // Белый цвет для текста на кнопках
        },
        text: {
          color: '#25ea2e',
        }
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#2a2a2a', // Серый фон для компонентов Paper
        },
      },
    },
  },
});

export default theme;
