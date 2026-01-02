import { Controller, Get, Post, Delete, Param, UseGuards, UseInterceptors, UploadedFile, Req, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AttachmentsService } from './attachments.service';
import { randomBytes } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

const uploadDir = './uploads/attachments';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueId = randomBytes(16).toString('hex');
    cb(null, `${uniqueId}${ext}`);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const forbidden = ['.exe', '.bat', '.cmd', '.sh', '.ps1'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (forbidden.includes(ext)) cb(new BadRequestException('不支持的文件类型'), false);
  else cb(null, true);
};

@Controller('attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(private service: AttachmentsService) {}

  @Post(':taskId')
  @UseInterceptors(FileInterceptor('file', { storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(@Param('taskId') taskId: string, @UploadedFile() file: Express.Multer.File, @Req() req) {
    if (!file) throw new BadRequestException('请选择文件');
    return this.service.create(taskId, req.user.id, req.user.currentTeamId, file);
  }

  @Get(':taskId')
  findByTask(@Param('taskId') taskId: string) {
    return this.service.findByTask(taskId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req) {
    return this.service.delete(id, req.user.id, req.user.currentTeamId);
  }
}
