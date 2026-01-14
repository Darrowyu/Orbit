import React, { useState, useRef } from 'react';
import { Attachment } from '../types';
import { attachmentApi } from '../services/api';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { getErrorMessage } from '../utils/error';

interface AttachmentListProps {
  taskId: string;
  attachments: Attachment[];
  onUpdate: (attachments: Attachment[]) => void;
  readonly?: boolean;
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const getFileIcon = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return '📦';
  return '📎';
};

export const AttachmentList: React.FC<AttachmentListProps> = ({ taskId, attachments, onUpdate, readonly }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await attachmentApi.upload(taskId, file);
      onUpdate([data, ...attachments]);
    } catch (e) {
      alert(getErrorMessage(e, '上传失败'));
    } finally { 
      setUploading(false); 
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此附件？')) return;
    await attachmentApi.delete(id);
    onUpdate(attachments.filter((a) => a.id !== id));
  };

  const isImage = (mimeType: string) => mimeType.startsWith('image/');

  return (
    <div className="space-y-3">
      {!readonly && (
        <div 
          className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${dragOver ? 'border-[#001C3D] bg-[#001C3D]/5' : 'border-slate-200 hover:border-slate-300'}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input ref={fileRef} type="file" onChange={handleFileChange} className="hidden" />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} isLoading={uploading} leftIcon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}>
            上传文件
          </Button>
          <p className="text-xs text-slate-400 mt-2">或拖拽文件到此处，最大 10MB</p>
        </div>
      )}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl group hover:bg-slate-100 transition-colors">
              {isImage(att.mimeType) ? (
                <a href={att.url} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-lg overflow-hidden bg-white border border-slate-200 shrink-0">
                  <img src={att.url} alt={att.originalName} className="w-full h-full object-cover" />
                </a>
              ) : (
                <span className="text-2xl w-12 h-12 flex items-center justify-center bg-white rounded-lg border border-slate-200 shrink-0">{getFileIcon(att.mimeType)}</span>
              )}
              <div className="flex-1 overflow-hidden">
                <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-slate-700 hover:text-[#001C3D] truncate block">{att.originalName}</a>
                <span className="text-xs text-slate-400">{formatSize(att.size)}</span>
              </div>
              {!readonly && (
                <IconButton size="sm" variant="ghost" onClick={() => handleDelete(att.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50" title="删除">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </IconButton>
              )}
            </div>
          ))}
        </div>
      )}
      {attachments.length === 0 && readonly && (
        <p className="text-sm text-slate-400 text-center py-2">暂无附件</p>
      )}
    </div>
  );
};
