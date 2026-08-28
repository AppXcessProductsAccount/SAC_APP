# Build stage
FROM node:20-alpine AS build
WORKDIR /app
# .env is dockerignored, so this arg is the only source of the API URL at build time.
ARG VITE_API_URL=https://api.selfawarenesscentre.org
ENV VITE_API_URL=$VITE_API_URL
COPY package.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine
# Replaces the stock config, which 404s on every route but /.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
