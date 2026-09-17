import { create } from 'zustand';
import { Comment } from '../services/api';

// 评论是任务详情的局部数据，仅服务当前打开的抽屉，用最小 store 打通 socket 事件
interface CommentStore {
  taskId: string | null; // 当前加载评论的任务 ID（socket 事件按它过滤）
  comments: Comment[];
  setComments: (taskId: string, comments: Comment[]) => void;
  addComment: (comment: Comment) => void; // 幂等：重复 id 忽略
  removeComment: (id: string) => void;
  clear: () => void;
}

export const useCommentStore = create<CommentStore>((set) => ({
  taskId: null,
  comments: [],

  // 按 id 合并而非整体替换：fetch 返回不能覆盖掉 socket 先到的评论
  setComments: (taskId, comments) =>
    set((s) => {
      if (taskId !== s.taskId) return { taskId, comments };
      const merged = [...comments];
      for (const c of s.comments) if (!merged.some((m) => m.id === c.id)) merged.push(c);
      return { taskId, comments: merged };
    }),

  addComment: (comment) =>
    set((s) =>
      comment.taskId !== s.taskId || s.comments.some((c) => c.id === comment.id)
        ? s
        : { comments: [...s.comments, comment] }
    ),

  removeComment: (id) =>
    set((s) =>
      s.comments.some((c) => c.id === id)
        ? { comments: s.comments.filter((c) => c.id !== id) }
        : s
    ),

  clear: () => set({ taskId: null, comments: [] }),
}));
