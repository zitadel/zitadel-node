FROM node:20

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci --no-progress

COPY . .

RUN npm run build

CMD ["node", "--require", "./dist/index.js"]
