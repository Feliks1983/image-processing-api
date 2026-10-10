import fs from 'fs';
import path from 'path';
import sharp, { Sharp } from 'sharp';
import { PROCESSED_DIR, UPLOAD_DIR } from '../config/multer';
import {
  ConvertOptions,
  defaultQuality,
  inputPixelLimit,
  ProcessOptions,
  sizes,
  WatermarkOptions,
  OutputFormat,
} from '../config/sharp';
import { extFor, newId } from '../utils/helpers';

export interface OutputFile {
  filename: string;
  width: number;
  height: number;
  bytes: number;
  format: OutputFormat;
}

function sourcePath(filename: string): string {
  const p = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(p)) throw new Error('File not found');
  return p;
}

const open = (filename: string): Sharp =>
  sharp(sourcePath(filename), { limitInputPixels: inputPixelLimit });

async function getOutputFormat(filename: string): Promise<OutputFormat> {
  const meta = await sharp(sourcePath(filename)).metadata();
  switch (meta.format) {
    case 'jpeg':
      return 'jpeg';
    case 'png':
      return 'png';
    case 'webp':
      return 'webp';
    case 'heif':
      return 'avif';
    default:
      return 'jpeg';
  }
}

async function applyFormat(img: Sharp, format: OutputFormat, quality: number): Promise<Sharp> {
  switch (format) {
    case 'jpeg':
      return img.jpeg({ quality, mozjpeg: true });
    case 'png':
      return img.png({ compressionLevel: 9 });
    case 'webp':
      return img.webp({ quality });
    case 'avif':
      return img.avif({ quality });
  }
}

async function writeOutput(
  img: Sharp,
  format: OutputFormat,
  quality: number,
  name?: string
): Promise<OutputFile> {
  const filename = name ?? `${newId()}.${extFor(format)}`;
  const info = await (
    await applyFormat(img, format, quality)
  ).toFile(path.join(PROCESSED_DIR, filename));
  return { filename, width: info.width, height: info.height, bytes: info.size, format };
}

export async function processImage(filename: string, output: ProcessOptions): Promise<OutputFile> {
  let img = open(filename);
  if (output.rotate !== undefined) img = img.rotate(output.rotate);
  if (output.width || output.height) {
    img = img.resize({
      width: output.width,
      height: output.height,
      fit: output.fit ?? (output.width && output.height ? 'cover' : 'inside'),
      withoutEnlargement: output.withoutEnlargement ?? false,
    });
  }
  if (output.flip) img = img.flip();
  if (output.flop) img = img.flop();
  if (output.grayscale) img = img.grayscale();
  if (output.blur !== undefined) img = img.blur(output.blur);
  if (output.sharpen) img = img.sharpen();
  const format = output.format ?? (await getOutputFormat(filename));
  return writeOutput(img, format, output.quality ?? defaultQuality);
}

export function convertFormat(filename: string, output: ConvertOptions): Promise<OutputFile> {
  const file = () => writeOutput(open(filename), output.format, output.quality ?? defaultQuality);
  return file();
}

export function generateThumbnail(
  filename: string,
  size = 150,
  format: OutputFormat = 'webp'
): Promise<OutputFile> {
  const file = () =>
    writeOutput(open(filename).resize(size, size, { fit: 'cover' }), format, defaultQuality);
  return file();
}

export function generateResponsive(
  filename: string,
  format: OutputFormat = 'webp',
  quality = defaultQuality
): Promise<(OutputFile & { size: string })[]> {
  const file = async () => {
    sourcePath(filename);
    const baseId = newId();
    return Promise.all(
      sizes.map(async s => {
        const img = s.square
          ? open(filename).resize(s.width, s.width, { fit: 'cover' })
          : open(filename).resize({ width: s.width, withoutEnlargement: true });
        const out = await writeOutput(
          img,
          format,
          quality,
          `${baseId}-${s.suffix}.${extFor(format)}`
        );
        return { size: s.suffix, ...out };
      })
    );
  };
  return file();
}

export function getMetadata(filename: string) {
  const file = async () => {
    const p = sourcePath(filename);
    const m = await sharp(p).metadata();
    return {
      filename,
      format: m.format,
      width: m.width,
      height: m.height,
      space: m.space,
      channels: m.channels,
      depth: m.depth,
      density: m.density,
      hasAlpha: m.hasAlpha,
      isProgressive: m.isProgressive,
      orientation: m.orientation,
      pages: m.pages,
      sizeBytes: fs.statSync(p).size,
    };
  };
  return file();
}

const escapeXml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export async function addWatermark(filename: string, o: WatermarkOptions): Promise<OutputFile> {
  const meta = await sharp(sourcePath(filename)).metadata();
  const swap = (meta.orientation ?? 1) >= 5;
  const W = (swap ? meta.height : meta.width) ?? 0;
  const H = (swap ? meta.width : meta.height) ?? 0;
  const len = o.text.length;
  const fs_ = Math.min(o.fontSize, Math.floor(W / (len * 0.6 + 1)), Math.floor(H / 2));
  if (fs_ < 8) throw new Error('Image is too small for this watermark text');
  const pad = Math.round(fs_ * 0.5);
  const w = Math.ceil(len * fs_ * 0.6) + pad * 2;
  const h = Math.ceil(fs_ * 1.2) + Math.round(fs_ * 0.6);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<rect width="100%" height="100%" rx="${Math.round(pad / 2)}" fill="black" fill-opacity="${(o.opacity * 0.5).toFixed(2)}"/>` +
    `<text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" ` +
    `font-family="sans-serif" font-size="${fs_}" fill="white" fill-opacity="${o.opacity}">` +
    `${escapeXml(o.text)}</text></svg>`;

  const img = open(filename).composite([{ input: Buffer.from(svg), gravity: o.position }]);
  const format = o.format ?? (await getOutputFormat(filename));
  return writeOutput(img, format, o.quality ?? defaultQuality);
}
