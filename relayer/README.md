# Crypto Caller Relayer

TON Relayer service for crypto-caller subscription system. This service processes subscription payments by performing TON to Jetton swaps and burning the received jettons.

## Features

- **Two-phase subscription**: Users get access only after successful swap and burn
- **Automatic refunds**: Failed swaps trigger automatic refunds to users
- **Rate limiting**: Prevents RPC overload with intelligent rate limiting
- **Monitoring**: Comprehensive metrics and health checks
- **Idempotency**: Prevents double-processing of transactions
- **Error handling**: Robust error handling with retry mechanisms

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Subscription   │───▶│     Relayer     │───▶│   STON.fi API   │
│    Contract     │    │    Service      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Jetton Master  │
                       │   (Burn)        │
                       └─────────────────┘
```

## Flow

1. User pays 0.75 TON to subscription contract
2. Contract sends 0.25 TON to owner, 0.5 TON to relayer
3. Relayer receives transaction and parses user address
4. Relayer performs TON → Jetton swap via STON.fi
5. Relayer burns received jettons
6. Relayer sends OnSwapCallback to contract
7. Contract activates user subscription

## Installation

```bash
cd relayer
npm install
```

## Configuration

Copy `env.example` to `.env` and configure:

```bash
cp env.example .env
```

### Required Environment Variables

- `RELAYER_PRIV_KEY`: Mnemonic phrase of relayer wallet (24 words)
- `RELAYER_WALLET_ADDR`: TON address of relayer wallet
- `SUBSCRIPTION_CONTRACT_ADDR`: Address of subscription contract
- `JETTON_MASTER_ADDR`: Address of jetton master contract
- `RPC_ENDPOINT`: TON RPC endpoint

## Running

### Development

```bash
npm run start:dev
```

### Production

```bash
npm run build
npm run start:prod
```

### Docker

```bash
docker build -t crypto-caller-relayer .
docker run -d --env-file .env crypto-caller-relayer
```

## API Endpoints

### Health Check

```bash
GET /health
```

Returns service health status and metrics.

### Transaction History

```bash
GET /transactions?limit=100
```

Returns recent transaction history.

## Monitoring

The service provides comprehensive monitoring:

- **Metrics**: Transaction counts, success rates, processing times
- **Health checks**: Wallet balance, RPC connectivity, processing status
- **Logging**: Structured logging with context
- **Alerts**: Automatic alerts for low balance, high failure rates

## Error Handling

- **Swap failures**: Automatic refunds to users
- **Burn failures**: Automatic refunds to users
- **RPC errors**: Retry with exponential backoff
- **Network issues**: Graceful degradation and recovery

## Security

- **Private key management**: Store in secure environment variables
- **Rate limiting**: Prevents RPC abuse
- **Input validation**: All inputs are validated and sanitized
- **Error sanitization**: Sensitive data is not logged

## Development

### Project Structure

```
src/
├── modules/
│   ├── ton/          # TON blockchain integration
│   ├── swap/         # STON.fi swap integration
│   ├── burn/         # Jetton burning
│   └── monitoring/   # Metrics and logging
├── services/
│   └── relayer.service.ts  # Main service
├── entities/
│   └── transaction.entity.ts  # Database entity
└── config/
    └── relayer.config.ts  # Configuration
```

### Adding New Features

1. Create module in `src/modules/`
2. Add service implementation
3. Update `app.module.ts` to include new module
4. Add tests in `src/modules/*/tests/`

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Deployment

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis
- TON RPC access

### Environment Setup

1. Set up PostgreSQL database
2. Set up Redis instance
3. Configure TON RPC endpoint
4. Deploy relayer service
5. Configure monitoring and alerts

### Production Checklist

- [ ] Private keys stored securely
- [ ] Database backups configured
- [ ] Monitoring and alerts set up
- [ ] Rate limiting configured
- [ ] Health checks working
- [ ] Error handling tested
- [ ] Documentation updated

## Troubleshooting

### Common Issues

1. **Low wallet balance**: Check relayer wallet has enough TON for gas
2. **RPC errors**: Verify RPC endpoint is accessible and stable
3. **Swap failures**: Check STON.fi API status and liquidity
4. **Database errors**: Verify PostgreSQL connection and permissions

### Logs

Check logs for detailed error information:

```bash
docker logs crypto-caller-relayer
```

### Health Check

```bash
curl http://localhost:3001/health
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## License

Private - All rights reserved