FROM node:25

WORKDIR /app

COPY package.json package-lock.json* ./

# Skip lifecycle scripts during install to avoid triggering the prepare build
# before sources are copied. Build explicitly after sources are in place.
RUN npm ci --no-progress --ignore-scripts

COPY . .

RUN npm run build

CMD ["node", "--require", "./dist/index.ts"]
