import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const tmpDir = path.join('/tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, tmpDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).array('images');

// Middleware personalizado para manejar errores
export const uploadImage = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  upload(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          error: true,
          message:
            'Alguna imagen excede el límite permitido de 5MB. Reduce el tamaño e intenta de nuevo.',
        });
        return;
      }

      res.status(400).json({
        error: true,
        message: 'Error al subir las imágenes. Intenta de nuevo.',
      });
      return;
    }
    next();
  });
};
