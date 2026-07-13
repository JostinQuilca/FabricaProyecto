# ==========================================
# ETAPA 1: Compilación y dependencias (Builder)
# ==========================================
FROM node:18-alpine AS builder
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalación limpia de paquetes de Node
RUN npm ci

# Copiar el código fuente del backend
COPY . .

# ==========================================
# ETAPA 2: Entorno de ejecución ligero (Runner)
# ==========================================
FROM node:18-alpine AS runner
WORKDIR /app

# Configurar entorno de producción
ENV NODE_ENV=production

# Copiar únicamente lo necesario desde la etapa de compilación
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/database ./database
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/factory-config.json ./factory-config.json

# Puerto típico que expone Apollo Server / GraphQL
EXPOSE 4000

# Comando para iniciar tu servidor de backend
CMD ["node", "src/server.js"]