FROM node:20

# Create and set the working directory
WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install packages with ignore-scripts to avoid ARM64/Windows compilation issues inside target layers
RUN npm install

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy the rest of the application files
COPY . .

# Expose port
EXPOSE 5002

# Run the server
CMD ["node", "index.js"]
