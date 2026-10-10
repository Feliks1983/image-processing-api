import sharp from 'sharp';

sharp.cache(false);

export const formats = ['jpeg', 'png', 'webp', 'avif'] as const;
export type OutputFormat = (typeof formats)[number];

export const filModes = ['cover', 'contain', 'fill', 'inside', 'outside'] as const;
export type FitMode = (typeof filModes)[number];

export const maxDimension = 5000;
export const defaultQuality = 80;
export const inputPixelLimit = 50_000_000;

export const watermarkPosition = [
  'northwest',
  'north',
  'northeast',
  'west',
  'center',
  'east',
  'southwest',
  'south',
  'southeast',
] as const;
export type WatermarkPosition = (typeof watermarkPosition)[number];

export const sizes: readonly {
  suffix: string; width: number; square?: boolean 
}[] = [
  { suffix: 'thumbnail', width: 150, square: true },
  { suffix: 'small', width: 320 },
  { suffix: 'medium', width: 640 },
  { suffix: 'large', width: 1280 },
  { suffix: 'xlarge', width: 1920 },
];

export interface ProcessOptions {
  width?: number;
  height?: number;
  fit?: FitMode;
  withoutEnlargement?: boolean;
  format?: OutputFormat;
  quality?: number;
  sharpen?: boolean;
  blur?: number;
  grayscale?: boolean;
  rotate?: number;
  flip?: boolean;
  flop?: boolean;
}

export interface ConvertOptions {
  format: OutputFormat;
  quality?: number;
}

export interface WatermarkOptions {
  text: string;
  position: WatermarkPosition;
  opacity: number;
  fontSize: number;
  format?: OutputFormat;
  quality?: number;
}
