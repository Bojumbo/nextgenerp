FROM node:20-alpine

WORKDIR /workspace

# Install dependencies
COPY package.json .
RUN npm install

# Copy source code
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
