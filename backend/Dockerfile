# ==========================================
# ETAPA 1: Compilación y dependencias (Builder)
# ==========================================
FROM node:18-alpine AS builder
WORKDIR /app

# Copiar el manifiesto de dependencias
COPY package.json ./

# git es necesario para resolver las librerías @fabrica/* alojadas en
# ramas de GitHub (github:JostinQuilca/FabricaProyecto#pkg/*)
RUN apk add --no-cache git

# Instalación de paquetes (install, no ci: trae la última versión de las
# ramas pkg/* de las librerías, que se actualizan)
RUN npm install --no-audit --no-fund

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