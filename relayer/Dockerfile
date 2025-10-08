FROM node:18-alpine

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies with clean cache
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# Copy source code
COPY . .

# Install dev dependencies for build
RUN npm install --only=dev --no-audit --no-fund

# Build the application
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Clean npm cache
RUN npm cache clean --force

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "run", "start:prod"]