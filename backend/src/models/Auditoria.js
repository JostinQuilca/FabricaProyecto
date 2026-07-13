const { client } = require('../config/database');

const Auditoria = {
  /**
   * Registra un evento de auditoría en la base de datos.
   * @param {Object} params
   * @param {number|null} params.usuarioId - ID del usuario que realizó la acción
   * @param {string} params.accion - Tipo de acción (LOGIN, LOGOUT, LOGIN_FALLIDO, REGISTRO, ACCESO_RUTA)
   * @param {string|null} params.entidad - Entidad afectada (ej: 'usuarios', 'roles')
   * @param {number|null} params.entidadId - ID de la entidad afectada
   * @param {string|null} params.detalles - Descripción adicional del evento
   * @param {string|null} params.ipAddress - Dirección IP del cliente
   */
  registrar: async ({ usuarioId = null, accion, entidad = null, entidadId = null, detalles = null, ipAddress = null }) => {
    const { rows } = await client.query(
      `INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalles, ip_address, fecha_hora)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [usuarioId, accion, entidad, entidadId, detalles, ipAddress]
    );
    return rows[0];
  },

  /**
   * Obtiene todos los registros de auditoría, ordenados del más reciente al más antiguo.
   * @param {number} limit - Cantidad máxima de registros a retornar
   * @param {number} offset - Cantidad de registros a saltar (para paginación)
   */
  findAll: async (limit = 50, offset = 0) => {
    const { rows } = await client.query(
      `SELECT a.*, u.nombre as usuario_nombre, u.email as usuario_email
       FROM auditoria a
       LEFT JOIN usuarios u ON a.usuario_id = u.id
       ORDER BY a.fecha_hora DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows;
  },

  /**
   * Obtiene los registros de auditoría de un usuario específico.
   * @param {number} usuarioId - ID del usuario
   * @param {number} limit - Cantidad máxima de registros
   */
  findByUsuario: async (usuarioId, limit = 50) => {
    const { rows } = await client.query(
      `SELECT * FROM auditoria 
       WHERE usuario_id = $1 
       ORDER BY fecha_hora DESC 
       LIMIT $2`,
      [usuarioId, limit]
    );
    return rows;
  },

  /**
   * Obtiene los registros de auditoría filtrados por tipo de acción.
   * @param {string} accion - Tipo de acción a filtrar
   * @param {number} limit - Cantidad máxima de registros
   */
  findByAccion: async (accion, limit = 50) => {
    const { rows } = await client.query(
      `SELECT a.*, u.nombre as usuario_nombre, u.email as usuario_email
       FROM auditoria a
       LEFT JOIN usuarios u ON a.usuario_id = u.id
       WHERE a.accion = $1 
       ORDER BY a.fecha_hora DESC 
       LIMIT $2`,
      [accion, limit]
    );
    return rows;
  },
};

module.exports = { Auditoria };
