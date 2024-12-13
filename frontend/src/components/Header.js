import { TonConnectButton } from '@tonconnect/ui-react';
import { Box } from '@mui/material';

const Header = () => {
  return (
    <header>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center', // Выравнивание по горизонтали (по центру)
          alignItems: 'center', // Выравнивание по вертикали (по центру)
          height: '100%', // Устанавливаем высоту, чтобы кнопка располагалась по центру всего доступного пространства
          marginBottom: 3,
        }}
      >
        <TonConnectButton />
      </Box>
    </header>
  );
};

export default Header;
