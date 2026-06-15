FROM node:24

WORKDIR /app

COPY package.json package-lock.json* ./

# Skip lifecycle scripts during install to avoid triggering the prepare build
# before sources are copied. Build explicitly after sources are in place.
RUN npm ci --no-progress --ignore-scripts

COPY . .

RUN npm run build

# Start a Node REPL. The built SDK is an ESM package ("type": "module"), so it
# cannot be CommonJS-preloaded via --require; instead the REPL/stdin can pull it
# in on demand. Node 24's synchronous require()-of-ESM lets a piped snippet do
# `require("./dist/index.js").Zitadel` against the built artifact.
CMD ["node"]
