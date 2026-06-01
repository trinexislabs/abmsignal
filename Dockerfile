# syntax=docker/dockerfile:1
###############################################################################
# ABMSignal production image
#
# A single image is built and reused for three roles (web / worker / migrate),
# each selected by overriding the container command in docker-compose.yml:
#   web      -> npm run start            (Next.js server)
#   worker   -> npx tsx ...worker        (BullMQ consumer)
#   migrate  -> npx prisma migrate deploy
#
# We intentionally keep the full dependency tree in the runtime image because:
#   - the worker executes TypeScript directly via `tsx` (a devDependency)
#   - migrations need the `prisma` CLI (a devDependency)
#   - the Prisma client is generated into src/generated/prisma (gitignored)
###############################################################################

FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production
# openssl + ca-certificates are required by Prisma and TLS (Redis/libsql over rediss/https)
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# ---- dependencies ----------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ---- build -----------------------------------------------------------------
FROM deps AS build
COPY . .

# NEXT_PUBLIC_* values are inlined into the client bundle at BUILD time, so they
# must be present here (not just at runtime). They are passed in as build args
# from docker-compose.yml (build.args).
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Generate the Prisma client (output: src/generated/prisma) then compile Next.js.
RUN npx prisma generate
RUN npm run build

# ---- runtime ---------------------------------------------------------------
FROM base AS runtime
ENV PORT=3000

# Copy the built app plus everything the web server, worker and migrate jobs need.
COPY --from=build /app/node_modules     ./node_modules
COPY --from=build /app/.next            ./.next
COPY --from=build /app/public           ./public
COPY --from=build /app/src              ./src
COPY --from=build /app/prisma           ./prisma
COPY --from=build /app/package.json     ./package.json
COPY --from=build /app/next.config.ts   ./next.config.ts
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/tsconfig.json    ./tsconfig.json

# Run as the unprivileged node user shipped in the base image.
RUN chown -R node:node /app
USER node

EXPOSE 3000
# Default command is the web server; worker/migrate override this in compose.
CMD ["npm", "run", "start"]
