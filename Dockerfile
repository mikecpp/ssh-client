# Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package.json frontend/package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY frontend/ .

# Build the application
RUN npm run build

# Build backend
FROM golang:1.25-alpine AS backend-builder

WORKDIR /app/backend

# Copy go mod files
COPY backend/go.mod backend/go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY backend/ .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Final stage - combine both
FROM nginx:alpine

# Install ca-certificates and supervisor to run both nginx and backend
RUN apk --no-cache add ca-certificates supervisor

# Copy backend binary
COPY --from=backend-builder /app/backend/main /app/backend/main

# Copy frontend built files
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Create supervisor configuration
RUN mkdir -p /etc/supervisor/conf.d
COPY supervisord.conf /etc/supervisord.conf

# Expose ports
EXPOSE 80 5555

# Run supervisor to manage both services
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
