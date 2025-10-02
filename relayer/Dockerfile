FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy source code first (needed for build)
COPY . .

# Install all dependencies (including dev for build)
RUN npm install

# Build the application
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "run", "start:prod"]