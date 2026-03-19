# ---- Frontend Build ----
FROM node:20-alpine AS frontend-builder
WORKDIR /app/web
COPY web/package.json web/package-lock.json* ./
RUN npm ci
COPY web/ .
RUN npm run build

# ---- Backend Build ----
FROM golang:1.23-alpine AS backend-builder
RUN apk add --no-cache gcc musl-dev sqlite-dev
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend-builder /app/web/dist ./web/dist
RUN CGO_ENABLED=1 GOOS=linux go build -tags sqlite_fts5 -o poe-armory .

# ---- Runtime ----
FROM alpine:3.20
RUN apk add --no-cache sqlite-libs ca-certificates
WORKDIR /app
COPY --from=backend-builder /app/poe-armory .
COPY --from=backend-builder /app/web/dist ./web/dist
COPY config.yaml .

RUN mkdir -p /app/data

EXPOSE 8080
ENTRYPOINT ["./poe-armory"]
CMD ["serve"]
