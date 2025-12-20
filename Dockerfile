# Stage 1: build the React + Vite app
FROM node:20-alpine AS build

# Build-time env for Vite
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Set working directory inside the image
WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the frontend code
COPY . .

# Build the production bundle (output goes to /app/dist)
RUN npm run build

# Stage 2: run a small web server to serve the built files
FROM node:20-alpine

WORKDIR /app

# Install a tiny static file server
RUN npm install -g serve

# Copy the built files from the first stage
COPY --from=build /app/dist ./dist

# Expose port 80 in the container
EXPOSE 80

# Start the static file server on port 80
CMD ["serve", "-s", "dist", "-l", "80"]
