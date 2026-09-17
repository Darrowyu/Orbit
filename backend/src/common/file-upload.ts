import * as path from 'path';
import * as fs from 'fs';
import { randomBytes } from 'crypto';

// 图片扩展名白名单（头像等场景）
export const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

// 附件扩展名白名单：图片 + pdf + 常见办公文档
export const ATTACHMENT_EXTS = [
  ...IMAGE_EXTS,
  'pdf',
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'txt', 'md', 'csv', 'zip',
];

// 扩展名 -> 允许的 mimetype 集合
const MIME_MAP: Record<string, string[]> = {
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  gif: ['image/gif'],
  webp: ['image/webp'],
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  txt: ['text/plain'],
  md: ['text/markdown', 'text/x-markdown', 'text/plain'],
  csv: ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
  zip: ['application/zip', 'application/x-zip-compressed'],
};

// 清洗原始文件名：去路径分隔符与 null 字节，仅用于展示与校验
export function sanitizeOriginalName(name: string): string {
  return path.basename(String(name || '').replace(/\0/g, ''));
}

// 取清洗后文件名的最后扩展名（小写、不含点），无扩展名返回空串
// 双重扩展名如 x.html.png 按最后的 .png 判定
export function getSafeExtension(originalname: string): string {
  const ext = path.extname(sanitizeOriginalName(originalname)).toLowerCase();
  return ext.startsWith('.') ? ext.slice(1) : ext;
}

// 白名单校验：扩展名必须在白名单内，且 mimetype 与扩展名映射匹配
// 返回错误信息，通过时返回 null
export function validateUploadFile(file: Pick<Express.Multer.File, 'originalname' | 'mimetype'>, allowedExts: string[]): string | null {
  const ext = getSafeExtension(file.originalname);
  if (!ext || !allowedExts.includes(ext)) return '不支持的文件类型';
  const mimes = MIME_MAP[ext];
  // 部分浏览器对 md/zip 等类型不上报 mimetype，空值放行（图片另有魔数校验兜底）
  if (file.mimetype && mimes && !mimes.includes(file.mimetype)) return '文件类型与扩展名不匹配';
  return null;
}

// 生成安全文件名：随机名 + 白名单内扩展名，保持现有风格
export function randomSafeFilename(ext: string, prefix = ''): string {
  return `${prefix}${randomBytes(16).toString('hex')}.${ext}`;
}

// 图片魔数校验：读取文件头比对 jpeg/png/gif/webp 特征字节
export function hasImageMagicBytes(filePath: string, ext: string): boolean {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(12);
    const len = fs.readSync(fd, buf, 0, 12, 0);
    if (len < 4) return false;
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
      case 'png':
        return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
      case 'gif':
        return buf.toString('ascii', 0, 4) === 'GIF8';
      case 'webp':
        return len >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
      default:
        return false;
    }
  } finally {
    fs.closeSync(fd);
  }
}
