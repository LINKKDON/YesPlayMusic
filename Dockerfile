FROM node:22-alpine AS build
ENV VUE_APP_NETEASE_API_URL=/api
ENV NODE_OPTIONS=--openssl-legacy-provider
WORKDIR /app
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories && \
    apk add --no-cache python3 make g++ git
COPY package.json yarn.lock ./
RUN corepack enable && \
    corepack prepare yarn@1.22.22 --activate && \
    yarn config set electron_mirror https://npmmirror.com/mirrors/electron/ && \
    yarn config set registry https://registry.npmmirror.com && \
    yarn install
COPY . .
RUN yarn build

FROM node:22-alpine AS app
WORKDIR /app
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories && \
    apk add --no-cache nginx && \
    npm config set registry https://registry.npmmirror.com && \
    npm install --global @neteasecloudmusicapienhanced/api@4.29.19

COPY --from=build /app/docker/nginx.conf.example /etc/nginx/http.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

CMD ["sh", "-c", "nginx && exec npx @neteasecloudmusicapienhanced/api@4.29.19"]