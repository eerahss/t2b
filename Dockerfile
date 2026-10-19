FROM oven/bun:1-alpine
WORKDIR /app

# Copy package configuration
COPY package.json ./

# Install dependencies
RUN bun install --production

# Copy the rest of the application code
COPY . .

# Expose port 
EXPOSE 3000

# Use shell form so Railway's dynamic $PORT variable is correctly picked up
CMD bun run server.ts