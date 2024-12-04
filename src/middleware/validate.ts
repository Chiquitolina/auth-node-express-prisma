import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body); // Valida el cuerpo de la solicitud
      next(); // Continúa si es válido
    } catch (error) {
      res.status(400).json({
        message: 'Validation error',
        errors: (error as any).errors, // Devuelve los errores de validación
      });
    }
  };
};