import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { UPLOAD_DIR } from '../config/multer';
import { checkImageFormat } from '../utils/helpers';
import { generateResponsive } from '../services/imageService';

const fileInfo = (file: Express.Multer.File) => ({
  filename: file.filename,
  originalName: file.originalname,
  mimeType: file.mimetype,
  size: file.size,
  url: `/api/upload/file/${file.filename}`,
});

export const uploadSingle = (req: Request, res: Response) => {
  res.status(201).json({ message: 'File uploaded', file: fileInfo(req.file!) });
};

export const uploadMultiple = (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  res
    .status(201)
    .json({ message: 'File uploaded', count: files.length, files: files.map(fileInfo) });
};

export const uploadFields = (req: Request, res: Response) => {
  const group = req.files as Record<string, Express.Multer.File[]>;
  const result: Record<string, ReturnType<typeof fileInfo>[]> = {};
  for (const [field, files] of Object.entries(group)) result[field] = files.map(fileInfo);
  res.status(201).json({ message: 'File uploaded', files: result });
};

export const uploadResponsive = async (req: Request, res: Response) => {
  const file = req.file!;
  const responsive = await generateResponsive(file.filename, 'webp');
  res.status(201).json({
    message: 'Image uploaded and responsive versions generated',
    file: fileInfo(file),
    responsive: responsive.map(r => ({ size: r.size, ...checkImageFormat(req, r) })),
  });
};

export const listFiles = async (req: Request, res: Response) => {
  const names = await fs.promises.readdir(UPLOAD_DIR);
  const files = await Promise.all(
    names.map(async name => {
      const stat = await fs.promises.stat(path.join(UPLOAD_DIR, name));
      return {
        filename: name,
        size: stat.size,
        uploadedAt: stat.birthtime,
        url: `/api/upload/file/${name}`,
      };
    })
  );
  res.json({ count: files.length, files });
};

export const getFile = (req: Request, res: Response) => {
  const filename = String(req.params.filename);
  res.sendFile(filename, { root: UPLOAD_DIR, dotfiles: 'deny' }, err => {
    if (err && !res.headersSent) res.status(404).json({ error: 'File not found' });
  });
};

export const deleteFile = async (req: Request, res: Response) => {
  const target = path.join(UPLOAD_DIR, String(req.params.filename));
  try {
    await fs.promises.unlink(target);
    res.json({ message: 'File deleted' });
  } catch (error) {
    res.status(404).json({ error: 'File not found' });
  }
};

