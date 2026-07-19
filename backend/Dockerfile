# ==========================================
# ETAPA 1: Compilación y dependencias (Builder)
# El contexto de build es la RAÍZ del repo (no ./backend), para poder
# copiar el factory-config.json de la raíz sin duplicarlo.
#   docker build -f backend/Dockerfile .
# ==========================================
FROM node:18-alpine AS builder
WORKDIR /app

# git es necesario para resolver las librerías @fabrica/* alojadas en
# ramas de GitHub (github:JostinQuilca/FabricaProyecto#pkg/*)
RUN apk add --no-cache git

# Copiar el manifiesto de dependencias
COPY backend/package.json ./

# Instalación de paquetes (install, no ci: trae la última versión de las
# ramas pkg/* de las librerías, que se actualizan)
RUN npm install --no-audit --no-fund

# Copiar el código del backend y la configuración de la fábrica (raíz)
COPY backend/ ./
COPY factory-config.json ./factory-config.json

# ==========================================
# ETAPA 2: Entorno de ejecución ligero (Runner)
# ==========================================
FROM node:18-alpine AS runner
WORKDIR /app

# Configurar entorno de producción
ENV NODE_ENV=production

# Copiar únicamente lo necesario desde la etapa de compilación
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/database ./database
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/factory-config.json ./factory-config.json

# Puerto por defecto del backend (ver factory-config.entorno.puerto_backend)
EXPOSE 4300

# Comando para iniciar tu servidor de backend
CMD ["node", "src/server.js"]
