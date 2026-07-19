// ============================================================
// @fabrica/node-core · Composición de módulos GraphQL
// Reúne typeDefs (array) y hace merge profundo de resolvers de
// cada módulo activo. Base para el ensamblaje por librerías.
// ============================================================

/** Merge profundo de mapas de resolvers (Query, Mutation, tipos). */
function mergeResolvers(target, source) {
  for (const key of Object.keys(source)) {
    if (target[key] && typeof target[key] === 'object' && typeof source[key] === 'object') {
      target[key] = { ...target[key], ...source[key] };
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

/**
 * Compone una lista de módulos { typeDefs, resolvers } en algo que
 * ApolloServer acepta directamente.
 * @param {Array<{typeDefs:string, resolvers:object}>} modules
 * @returns {{ typeDefs: string[], resolvers: object }}
 */
function composeModules(modules) {
  const typeDefs = [];
  const resolvers = {};
  for (const mod of modules) {
    if (!mod) continue;
    if (mod.typeDefs) typeDefs.push(mod.typeDefs);
    if (mod.resolvers) mergeResolvers(resolvers, mod.resolvers);
  }
  return { typeDefs, resolvers };
}

module.exports = { composeModules, mergeResolvers };
