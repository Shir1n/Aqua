// Express 4 no captura errores de handlers async: los envía al manejador de errores.
export const asincrono = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
