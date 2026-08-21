FROM node:24-alpine

WORKDIR /app

ARG NET_VERSION=0.2.0-dev.0
ARG NET_COMMIT_SHA=development
ARG NET_BUILD_TIME=unknown
ARG NET_IMAGE_REF=local

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production \
    NET_VERSION=$NET_VERSION \
    NET_COMMIT_SHA=$NET_COMMIT_SHA \
    NET_BUILD_TIME=$NET_BUILD_TIME \
    NET_IMAGE_REF=$NET_IMAGE_REF
EXPOSE 3000

CMD ["npm", "start"]
