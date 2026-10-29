FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/domain/package.json packages/domain/package.json
RUN pnpm install --no-frozen-lockfile
COPY apps/api apps/api
COPY apps/web apps/web
COPY packages/domain packages/domain
RUN pnpm build
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3001
CMD ["pnpm", "--filter", "@passage/api", "start"]
