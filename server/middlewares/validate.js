const { ZodError } = require('zod');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source] ?? {});
      req[source] = parsed; // normaliza datos validados
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: err.errors,
        });
      }
      next(err);
    }
  };
}

module.exports = { validate };