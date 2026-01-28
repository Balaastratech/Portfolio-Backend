import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Validation middleware factory
 * Creates middleware that validates request body against a Zod schema
 */
export function validate<T>(schema: ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            const validated = schema.parse(req.body);
            req.body = validated;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const formattedErrors = error.issues.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));

                res.status(400).json({
                    error: 'Validation Error',
                    message: 'Invalid request data',
                    details: formattedErrors,
                });
                return;
            }

            res.status(400).json({
                error: 'Validation Error',
                message: 'Invalid request data',
            });
        }
    };
}

/**
 * Validate query parameters
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            const validated = schema.parse(req.query);
            req.query = validated as typeof req.query;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const formattedErrors = error.issues.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));

                res.status(400).json({
                    error: 'Validation Error',
                    message: 'Invalid query parameters',
                    details: formattedErrors,
                });
                return;
            }

            res.status(400).json({
                error: 'Validation Error',
                message: 'Invalid query parameters',
            });
        }
    };
}

/**
 * Validate route parameters
 */
export function validateParams<T>(schema: ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            const validated = schema.parse(req.params);
            req.params = validated as typeof req.params;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const formattedErrors = error.issues.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));

                res.status(400).json({
                    error: 'Validation Error',
                    message: 'Invalid route parameters',
                    details: formattedErrors,
                });
                return;
            }

            res.status(400).json({
                error: 'Validation Error',
                message: 'Invalid route parameters',
            });
        }
    };
}
