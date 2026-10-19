FROM oven/bun:1-alpine
WORKDIR /app

# Copy package configuration
COPY package.json ./

# Install dependencies
RUN bun install --production

# Copy the rest of the application code
COPY . .

# Expose port (Railway will map it automatically)
EXPOSE 3000

# Start the server using Bun
CMD ["bun", "run", "server.ts"]