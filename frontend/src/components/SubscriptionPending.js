import React from 'react';
import { Box, Typography } from '@mui/material';
import waitIcon from '../assets/wait.png';

const SubscriptionPending = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: 2,
        '@keyframes rotate': {
          '0%': {
            transform: 'rotate(0deg)',
          },
          '100%': {
            transform: 'rotate(180deg)',
          },
        },
        '& img': {
          animation: 'rotate 3s linear infinite',
          width: '64px',
          height: '64px',
        },
      }}
    >
      <img 
        src={waitIcon} 
        alt="Processing..." 
      />
      <Typography 
        variant="h6" 
        sx={{ 
          color: '#fff',
          fontWeight: 'bold',
          textAlign: 'center'
        }}
      >
        Pending...
      </Typography>
    </Box>
  );
};

export default SubscriptionPending;
