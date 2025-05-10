FROM node:18-alpine

# Install required compilation tools
RUN apk update && apk add --no-cache \
    gcc \
    g++ \
    python3 \
    py3-pip \
    openjdk11 \
    cmake \
    make \
    build-base

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Create a directory for temporary compilation files
RUN mkdir -p /app/temp

# Expose the port your compiler service will run on
EXPOSE 5000

CMD ["npm", "start"]