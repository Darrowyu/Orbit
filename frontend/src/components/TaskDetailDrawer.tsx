import React, { useState, useEffect, useRef } from 'react';
import { Task, User, Attachment, TaskStatus, Priority } from '../types';
import { commentApi, attachmentApi } from '../services/api';
import { useCommentStore } from '../stores/commentStore';
import { useAuthStore } from '../stores/authStore';
import { Avatar, Badge, Button, IconButton } from './ui';
import { openModalStack } from './ui/Modal';
import { AttachmentList } from './AttachmentList';
import { TimeTracker } from './TimeTracker';
import { MentionInput } from './MentionInput';
import { STATUS_LABELS, PRIORITY_LABELS } from '../constants/status';
import { getErrorMessage } from '../utils/error';

interface TaskDetailDrawerProps {
  task: Task | null; // null 表示关闭
  onClose: () => void;
  onEdit: (task: Task) => void;
  teamMembers: User[];
}

// 将 @[(name)](id) 提及渲染为高亮节点（纯 React 节点，不走 innerHTML）
const renderCommentContent = (content: string): React.ReactNode[] => {
  return content.split(/(@\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
    const m = part.match(/^@\[([^\]]+)\]\(([^)]+)\)$/);
    if (m) {
      return (
        <span key={i} className="text-[#001C3D] font-medium bg-[#001C3D]/5 rounded px-0.5">
          @{m[1]}
        </span>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
};

const formatDateTime = (d: string): string =>
  new Date(d).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const STATUS_BADGE: Record<TaskStatus, 'default' | 'primary' | 'warning' | 'success'> = {
  [TaskStatus.TODO]: 'default',
  [TaskStatus.IN_PROGRESS]: 'primary',
  [TaskStatus.REVIEW]: 'warning',
  [TaskStatus.DONE]: 'success',
};

const PRIORITY_BADGE: Record<Priority, 'success' | 'warning' | 'danger'> = {
  [Priority.LOW]: 'success',
  [Priority.MEDIUM]: 'warning',
  [Priority.HIGH]: 'danger',
};

// 评论区：列表 + MentionInput 输入
const CommentSection: React.FC<{ taskId: string; teamMembers: User[] }> = ({ taskId, teamMembers }) => {
  const currentUser = useAuthStore((s) => s.user);
  const comments = useCommentStore((s) => s.comments);
  const addComment = useCommentStore((s) => s.addComment);
  const removeComment = useCommentStore((s) => s.removeComment);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const text = content.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      const { data } = await commentApi.create(taskId, text);
      addComment(data); // socket 回播时按 id 幂等去重
      setContent('');
    } catch (e) {
      alert(getErrorMessage(e, '评论失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此评论？')) return;
    await commentApi.delete(taskId, id);
    removeComment(id); // socket 回播时 removeComment 幂等
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {comments.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-2">暂无评论，来说两句吧</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3 group">
            <Avatar src={c.user.avatar} fallback={c.user.avatar} name={c.user.name} size="sm" color={c.user.color} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">{c.user.name}</span>
                <span className="text-xs text-slate-400">{formatDateTime(c.createdAt)}</span>
                {c.userId === currentUser?.id && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-600 transition-opacity"
                  >
                    删除
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-600 mt-0.5 whitespace-pre-wrap break-words">{renderCommentContent(c.content)}</p>
            </div>
          </div>
        ))}
      </div>
      <div>
        <MentionInput
          value={content}
          onChange={setContent}
          members={teamMembers}
          placeholder="写下你的评论..."
          rows={2}
        />
        <div className="flex justify-end mt-2">
          <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={submitting} disabled={!content.trim()}>
            发表评论
          </Button>
        </div>
      </div>
    </div>
  );
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-sm font-semibold text-slate-700 mb-3">{children}</h3>
);

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({ task, onClose, onEdit, teamMembers }) => {
  const setComments = useCommentStore((s) => s.setComments);
  const clearComments = useCommentStore((s) => s.clear);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const taskId = task?.id;

  // 打开/切换任务时加载评论与附件，关闭时清空
  useEffect(() => {
    if (!taskId) {
      clearComments();
      setAttachments([]);
      return;
    }
    let cancelled = false;
    setComments(taskId, []); // 切换任务立即重置，避免闪现上一任务的评论
    setAttachments([]);
    commentApi.getByTask(taskId).then(({ data }) => {
      if (!cancelled) setComments(taskId, data);
    }).catch(() => { /* 评论加载失败保持空列表 */ });
    attachmentApi.getByTask(taskId).then(({ data }) => {
      if (!cancelled) setAttachments(data);
    }).catch(() => { /* 附件加载失败保持空列表 */ });
    return () => { cancelled = true; };
  }, [taskId, setComments, clearComments]);

  // 注册进 Modal 的 openModalStack 统一分发：Esc 只关栈顶（抽屉内"编辑"开的弹窗会后入栈，先关弹窗）
  // onClose 用 ref 持有，避免上层重渲染导致抽屉出栈再入栈、被顶到栈顶
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!task) return;
    const id = Symbol('drawer');
    openModalStack.push(id);
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openModalStack[openModalStack.length - 1] === id) onCloseRef.current();
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      const idx = openModalStack.indexOf(id);
      if (idx !== -1) openModalStack.splice(idx, 1);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [task]);

  if (!task) return null;

  const assignee = teamMembers.find((m) => m.id === task.assigneeId);
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;

  return (
    <div className="fixed inset-0 z-50">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* 抽屉主体 */}
      <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col animate-slide-in-right">
        {/* 头部 */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={STATUS_BADGE[task.status]} size="md">{STATUS_LABELS[task.status]}</Badge>
              <Badge variant={PRIORITY_BADGE[task.priority]} size="md">优先级: {PRIORITY_LABELS[task.priority]}</Badge>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 break-words">{task.title}</h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="outline" size="sm" onClick={() => onEdit(task)}>
              编辑
            </Button>
            <IconButton variant="ghost" onClick={onClose} className="text-slate-400 hover:text-slate-600" title="关闭">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </IconButton>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-8">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">负责人</p>
              <div className="flex items-center gap-2">
                <Avatar src={assignee?.avatar} fallback={assignee?.avatar || '?'} name={assignee?.name} size="xs" color={assignee?.color || 'bg-slate-100 text-slate-400'} />
                <span className="text-sm text-slate-700">{assignee?.name || '待认领'}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">截止日期</p>
              <p className="text-sm text-slate-700">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString('zh-CN') : '未设置'}
              </p>
            </div>
          </div>

          {/* 描述 */}
          <div>
            <SectionTitle>描述</SectionTitle>
            {task.description ? (
              <p className="text-sm text-slate-600 whitespace-pre-wrap break-words">{task.description}</p>
            ) : (
              <p className="text-sm text-slate-400">暂无描述</p>
            )}
          </div>

          {/* 标签 */}
          {task.labels && task.labels.length > 0 && (
            <div>
              <SectionTitle>标签</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {task.labels.map((l) => (
                  <span
                    key={l.id}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${l.color}1A`, color: l.color }}
                  >
                    {l.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 子任务 */}
          {task.subtasks.length > 0 && (
            <div>
              <SectionTitle>子任务 ({completedSubtasks}/{task.subtasks.length})</SectionTitle>
              <div className="space-y-1.5">
                {task.subtasks.map((st) => (
                  <div key={st.id} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${st.completed ? 'bg-[#001C3D] border-[#001C3D]' : 'border-slate-300'}`}>
                      {st.completed && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm ${st.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{st.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 计时 */}
          <div>
            <TimeTracker taskId={task.id} taskTitle={task.title} />
          </div>

          {/* 附件 */}
          <div>
            <SectionTitle>附件 ({attachments.length})</SectionTitle>
            <AttachmentList taskId={task.id} attachments={attachments} onUpdate={setAttachments} />
          </div>

          {/* 评论 */}
          <div>
            <SectionTitle>评论</SectionTitle>
            <CommentSection taskId={task.id} teamMembers={teamMembers} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailDrawer;
