FROM node:18-alpine

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Clean npm cache and install only production dependencies
RUN npm cache clean --force && \
    npm install --only=production --no-audit --no-fund --no-optional

# Copy source code
COPY . .

# Clean any existing build artifacts to ensure fresh compilation
RUN rm -rf dist/

# Install dev dependencies for build (without optional dependencies)
RUN npm install --only=dev --no-audit --no-fund --no-optional

# Build the application
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Clean npm cache and remove unnecessary files
RUN npm cache clean --force && \
    rm -rf /root/.npm && \
    rm -rf /tmp/*

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "run", "start:prod"]