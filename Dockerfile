FROM oven/bun:1-alpine
WORKDIR /app

# Copy package configuration
COPY package.json ./
RUN bun install --production

# Copy the rest of the application code
COPY . .

# Expose port
EXPOSE 3000

# Force Bun to execute using the shell so it picks up Railway's $PORT variable dynamically
CMD ["sh", "-c", "bun run server.ts"]