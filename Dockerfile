FROM node:18-bullseye

# Install Python and pip
RUN apt-get update && apt-get install -y python3 python3-pip && \
    ln -s /usr/bin/python3 /usr/bin/python

# Set working directory
WORKDIR /app

# Copy requirements first to cache pip install
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy Node.js dependency files
COPY backend/package.json backend/package-lock.json* ./backend/

# Install Node.js dependencies
WORKDIR /app/backend
RUN npm install

# Copy the rest of the application code
WORKDIR /app
COPY . .

# Build Node.js backend
WORKDIR /app/backend
RUN npm run build

# Switch back to root
WORKDIR /app

# Expose the port Render expects
EXPOSE 10000

# Make start script executable
RUN chmod +x start.sh

# Start both servers
CMD ["./start.sh"]
