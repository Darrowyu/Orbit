import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { unlinkSync } from 'fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IMAGE_EXTS, getSafeExtension, hasImageMagicBytes, randomSafeFilename, validateUploadFile } from '../common/file-upload';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const ext = getSafeExtension(file.originalname);
        cb(null, randomSafeFilename(ext, 'avatar-'));
      },
    }),
    // 白名单校验扩展名与 mimetype（均可伪造，落盘后另有魔数校验）
    fileFilter: (req, file, cb) => {
      const error = validateUploadFile(file, IMAGE_EXTS);
      if (error) return cb(new BadRequestException(error), false);
      cb(null, true);
    },
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  }))
  uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('请上传文件');
    // 魔数校验文件头，不通过则删除已落盘文件
    if (!hasImageMagicBytes(file.path, getSafeExtension(file.originalname))) {
      try { unlinkSync(file.path); } catch { /* 文件清理失败可忽略 */ }
      throw new BadRequestException('文件内容与图片格式不符');
    }
    return { url: `/uploads/${file.filename}` };
  }
}
