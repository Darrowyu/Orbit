import { Controller, Get, Post, Delete, Param, UseGuards, UseInterceptors, UploadedFile, Req, BadRequestException, ForbiddenException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AttachmentsService } from './attachments.service';
import { ATTACHMENT_EXTS, getSafeExtension, randomSafeFilename, sanitizeOriginalName, validateUploadFile } from '../common/file-upload';
import * as fs from 'fs';

const uploadDir = './uploads/attachments';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = getSafeExtension(file.originalname);
    cb(null, randomSafeFilename(ext));
  },
});

// 白名单校验：扩展名 + mimetype 匹配，防止 html/svg 等可执行内容上传
const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void): void => {
  const error = validateUploadFile(file, ATTACHMENT_EXTS);
  if (error) cb(new BadRequestException(error), false);
  else cb(null, true);
};

@Controller('attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(private service: AttachmentsService) {}

  private getTeamId(req): string { // teamId 为空说明用户尚未加入团队
    if (!req.user.currentTeamId) throw new ForbiddenException('请先加入或创建团队');
    return req.user.currentTeamId;
  }

  @Post(':taskId')
  @UseInterceptors(FileInterceptor('file', { storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }))
  async upload(@Param('taskId') taskId: string, @UploadedFile() file: Express.Multer.File, @Req() req) {
    if (!file) throw new BadRequestException('请选择文件');
    file.originalname = sanitizeOriginalName(file.originalname); // 入库前清洗原始文件名
    try {
      return await this.service.create(taskId, req.user.id, this.getTeamId(req), file);
    } catch (e) { // 入库失败时清理已落盘文件，避免孤儿文件（写法与删除路径一致）
      if (fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch { /* 忽略文件删除错误 */ }
      }
      throw e;
    }
  }

  @Get(':taskId')
  findByTask(@Param('taskId') taskId: string, @Req() req) {
    return this.service.findByTask(taskId, this.getTeamId(req));
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req) {
    return this.service.delete(id, req.user.id, this.getTeamId(req));
  }
}
