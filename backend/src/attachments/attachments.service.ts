import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

interface UploadedFile {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
}

@Injectable()
export class AttachmentsService {
  constructor(private prisma: PrismaService) {}

  async create(taskId: string, uploaderId: string, teamId: string, file: UploadedFile) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, teamId } });
    if (!task) throw new NotFoundException('任务不存在');
    
    return this.prisma.attachment.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `/uploads/attachments/${file.filename}`,
        taskId,
        uploaderId,
      },
    });
  }

  async findByTask(taskId: string) {
    return this.prisma.attachment.findMany({ where: { taskId }, orderBy: { createdAt: 'desc' } });
  }

  async delete(id: string, userId: string, teamId: string) {
    const att = await this.prisma.attachment.findUnique({ where: { id }, include: { task: true } });
    if (!att) throw new NotFoundException('附件不存在');
    if (att.task.teamId !== teamId) throw new ForbiddenException('无权限');
    
    const filePath = path.join(process.cwd(), 'uploads/attachments', att.filename);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch { /* 忽略文件删除错误 */ }
    }
    
    return this.prisma.attachment.delete({ where: { id } });
  }
}
