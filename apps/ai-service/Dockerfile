# Use the official lightweight Node.js 18 image.
# https://hub.docker.com/_/node
FROM node:20-slim

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this locally enables simple usage of npm install
COPY package*.json ./
COPY tsconfig.json ./

# Install production dependencies.
# If you add a package-lock.json speed your build by switching to 'npm ci'.
# RUN npm ci --only=production
RUN npm install

# Copy local code to the container image.
COPY . .

# Build the TypeScript code
RUN npm run build

# Run the web service on container startup.
CMD [ "npm", "start" ]
