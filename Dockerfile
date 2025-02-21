# Use a multi-stage build to reduce the final image size

# Stage 1: Build the Tauri application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first to leverage Docker's caching
COPY package*.json ./
COPY tauri.conf.json ./  # Important: Copy the Tauri config!

# Install dependencies - separate step for better caching
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the Tauri application.  Adjust the target if needed (e.g., 'linux-x64')
RUN npm run build -- --target <your_target> # Example: npm run build -- --target linux-x64

# Stage 2: Create a minimal runtime image (optional but recommended)
# Choose a base image appropriate for your target.  For Linux targets, consider
# a smaller distro like alpine or debian-slim. For Windows, you might use mcr.microsoft.com/windows/servercore:ltsc2022
FROM scratch # Or a minimal image like alpine:latest if you have native dependencies

WORKDIR /app

# Copy the built application from the builder stage
COPY --from=builder /app/dist /app/dist  # Adjust /app/dist if your build output is in a different location
# If your target is windows, you need to copy the whole project
# COPY --from=builder /app /app

# Copy necessary runtime dependencies if your application requires them.
# This is usually needed if you have native dependencies or are not using a
# statically linked build.  This step is highly dependent on your project.
# Example for some Linux targets (you might need more or different libs):
# COPY --from=builder /usr/lib/x86_64-linux-gnu/lib* /usr/lib/x86_64-linux-gnu/
# Example for windows
# COPY --from=builder /app/target/<your_target>/release/*.dll /app/

# Set the entrypoint to run your Tauri application.
# If you are targeting linux, you need to specify the executable name
# If you are targeting windows, you need to specify the executable name with extension
# Example for linux:
# CMD ["/app/dist/<your_app_name>"]
# Example for windows:
# CMD ["/app/dist/<your_app_name>.exe"]

# If you need to run any commands before the application starts, use a shell script:
# Example:
# COPY entrypoint.sh /app/
# RUN chmod +x /app/entrypoint.sh
# CMD ["/app/entrypoint.sh"]

# Example entrypoint.sh (linux)
# #!/bin/sh
# # Any pre-start commands here
# /app/dist/<your_app_name>

# Example entrypoint.bat (windows)
# @echo off
# <any pre-start command>
# /app/dist/<your_app_name>.exe

# Expose any ports your application uses (if applicable)
# EXPOSE 8080