

FROM node:22-slim AS base

ARG PORT=3000

ENV NEXT_TELEMETRY_DISABLED=1
# Add these lines right before CMD
# They provide fallback values to prevent crashes
ENV MONGODB_URI=${MONGODB_URI:-"mongodb://placeholder-will-fail-gracefully"}
ENV OPENAI_API_KEY=${OPENAI_API_KEY:-"placeholder-key"}
ENV AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-"placeholder-key"}
ENV AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-"placeholder-key"}
ENV AWS_REGION=${AWS_REGION:-"eu-north-1"}
ENV S3_BUCKET_NAME=${S3_BUCKET_NAME:-"fusiongame"}

WORKDIR /app

# Dependencies
FROM base AS dependencies

COPY package.json package-lock.json ./
RUN npm ci

# Build
FROM base AS build

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Public build-time environment variables
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

RUN npm run build

# Run
FROM base AS run

ENV NODE_ENV=production
ENV PORT=$PORT

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE $PORT

ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]