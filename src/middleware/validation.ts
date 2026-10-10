import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { watermarkPosition, formats, filModes, maxDimension } from '../config/sharp';

const signatures: Record<string, number[][]> = {
  jpg: [[0xff, 0xd8, 0xff]],
  jpeg: [[0xff, 0xd8, 0xff]],
  png: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  gif: [[0x47, 0x49, 0x46, 0x38]],
  pdf: [[0x25, 0x50, 0x44, 0x46]],
};

function collectFiles(req: Request): Express.Multer.File[] {
  if (req.file) return [req.file];
  if (Array.isArray(req.files)) return req.files;
  if (req.files) return Object.values(req.files).flat();
  return [];
}

function matchesSignature(file: Express.Multer.File): boolean {
  const ext = path.extname(file.filename).toLowerCase().replace('.', '');
  const sigs = signatures[ext];
  if (!sigs) {
    const buf = fs.readFileSync(file.path);
    return !buf.includes(0);
  }
  const fd = fs.openSync(file.path, 'r');
  try {
    const head = Buffer.alloc(8);
    fs.readSync(fd, head, 0, 8, 0);
    return sigs.some(sig => sig.every((b, i) => head[i] === b));
  } finally {
    fs.closeSync(fd);
  }
}

export function validateUploaded(req: Request, res: Response, next: NextFunction) {
  const files = collectFiles(req);
  if (files.length === 0) {
    return res.status(400).json({ error: 'File not transferred' });
  }
  const bad = files.filter(f => !matchesSignature(f));
  if (bad.length > 0) {
    files.forEach(f => fs.unlink(f.path, () => undefined));
    return res.status(400).json({
      error: 'The file content does not match its type',
      files: bad.map(f => f.originalname),
    });
  }
  next();
}

export function validateFilename(req: Request, res: Response, next: NextFunction) {
  const name = String(req.params.filename);
  if (!/^[a-f0-9-]{36}\.[a-z0-9]{2,5}$/.test(name) || name !== path.basename(name)) {
    return res.status(400).json({ error: 'Invalid file name' });
  }
  next();
}

type Body = Record<string, unknown>;

function int(b: Body, key: string, min: number, max: number, errors: string[]) {
  const v = b[key];
  if (v === undefined) return undefined;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
    errors.push(`${key} must be an integer between ${min} and ${max}`);
    return undefined;
  }
  return v;
}

function num(b: Body, key: string, min: number, max: number, errors: string[]) {
  const v = b[key];
  if (v === undefined) return undefined;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) {
    errors.push(`${key} must be a number between ${min} and ${max}`);
    return undefined;
  }
  return v;
}

function bool(b: Body, key: string, errors: string[]) {
  const v = b[key];
  if (v === undefined) return undefined;
  if (typeof v !== 'boolean') {
    errors.push(`${key} must be a boolean`);
    return undefined;
  }
  return v;
}

function oneOf<T extends string>(b: Body, key: string, allowed: readonly T[], errors: string[]) {
  const v = b[key];
  if (v === undefined) return undefined;
  if (typeof v !== 'string' || !allowed.includes(v as T)) {
    errors.push(`${key} must be one of: ${allowed.join(', ')}`);
    return undefined;
  }
  return v as T;
}

function unknownKeys(b: Body, allowed: string[], errors: string[]) {
  for (const k of Object.keys(b)) if (!allowed.includes(k)) errors.push(`Unknown option: ${k}`);
}

const bodyOf = (req: Request): Body =>
  req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? (req.body as Body) : {};

function finish(res: Response, next: NextFunction, errors: string[], options: unknown) {
  if (errors.length > 0) return res.status(400).json({ error: 'Invalid options', details: errors });
  res.locals.options = options;
  next();
}

export function validateProcessOptions(req: Request, res: Response, next: NextFunction) {
  const b = bodyOf(req);
  const errors: string[] = [];
  unknownKeys(
    b,
    [
      'width',
      'height',
      'fit',
      'withoutEnlargement',
      'format',
      'quality',
      'sharpen',
      'blur',
      'grayscale',
      'rotate',
      'flip',
      'flop',
    ],
    errors
  );
  const options = {
    width: int(b, 'width', 1, maxDimension, errors),
    height: int(b, 'height', 1, maxDimension, errors),
    fit: oneOf(b, 'fit', filModes, errors),
    withoutEnlargement: bool(b, 'withoutEnlargement', errors),
    format: oneOf(b, 'format', formats, errors),
    quality: int(b, 'quality', 1, 100, errors),
    sharpen: bool(b, 'sharpen', errors),
    blur: num(b, 'blur', 0.3, 100, errors),
    grayscale: bool(b, 'grayscale', errors),
    rotate: num(b, 'rotate', -360, 360, errors),
    flip: bool(b, 'flip', errors),
    flop: bool(b, 'flop', errors),
  };
  if (Object.keys(b).length === 0) errors.push('Provide at least one processing option');
  finish(res, next, errors, options);
}

export function validateConvertOptions(req: Request, res: Response, next: NextFunction) {
  const b = bodyOf(req);
  const errors: string[] = [];
  unknownKeys(b, ['format', 'quality'], errors);
  const format = oneOf(b, 'format', formats, errors);
  if (!format && b.format === undefined) errors.push('format is required');
  finish(res, next, errors, { format, quality: int(b, 'quality', 1, 100, errors) });
}

export function validateThumbnailOptions(req: Request, res: Response, next: NextFunction) {
  const b = bodyOf(req);
  const errors: string[] = [];
  unknownKeys(b, ['size', 'format'], errors);
  finish(res, next, errors, {
    size: int(b, 'size', 16, 500, errors),
    format: oneOf(b, 'format', formats, errors),
  });
}

export function validateWatermarkOptions(req: Request, res: Response, next: NextFunction) {
  const b = bodyOf(req);
  const errors: string[] = [];
  unknownKeys(b, ['text', 'position', 'opacity', 'fontSize', 'format', 'quality'], errors);
  let text = '';
  if (typeof b.text !== 'string' || b.text.trim().length < 1 || b.text.trim().length > 50) {
    errors.push('text is required (1-50 characters)');
  } else if (/[\u0000-\u001f]/.test(b.text)) {
    errors.push('text must not contain control characters');
  } else {
    text = b.text.trim();
  }
  finish(res, next, errors, {
    text,
    position: oneOf(b, 'position', watermarkPosition, errors) ?? 'southeast',
    opacity: num(b, 'opacity', 0.1, 1, errors) ?? 0.6,
    fontSize: int(b, 'fontSize', 8, 200, errors) ?? 32,
    format: oneOf(b, 'format', formats, errors),
    quality: int(b, 'quality', 1, 100, errors),
  });
}