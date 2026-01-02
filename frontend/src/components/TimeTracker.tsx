import React, { useState, useEffect, useRef } from 'react';
import { TimeEntry } from '../types';
import { timeEntryApi } from '../services/api';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';

interface TimeTrackerProps {
  taskId: string;
  taskTitle: string;
}

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}小时${m}分钟` : `${h}小时`;
};

const formatTime = (date: string): string => {
  return new Date(date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

export const TimeTracker: React.FC<TimeTrackerProps> = ({ taskId, taskTitle }) => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [running, setRunning] = useState<TimeEntry | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const intervalRef = useRef<NodeJS.Timer>();

  useEffect(() => {
    loadData();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [taskId]);

  useEffect(() => {
    if (running) {
      const start = new Date(running.startTime).getTime();
      const updateElapsed = () => setElapsed(Math.floor((Date.now() - start) / 60000));
      updateElapsed();
      intervalRef.current = setInterval(updateElapsed, 60000);
    } else {
      setElapsed(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [running]);

  const loadData = async () => {
    try {
      const [entriesRes, runningRes] = await Promise.all([
        timeEntryApi.getByTask(taskId),
        timeEntryApi.getRunning(),
      ]);
      setEntries(entriesRes.data);
      if (runningRes.data && runningRes.data.taskId === taskId) {
        setRunning(runningRes.data);
      }
    } finally { setLoading(false); }
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      const { data } = await timeEntryApi.start(taskId);
      setRunning(data);
    } catch (e: any) {
      alert(e.response?.data?.message || '启动失败');
    } finally { setStarting(false); }
  };

  const handleStop = async () => {
    if (!running) return;
    try {
      const { data } = await timeEntryApi.stop(running.id);
      setRunning(null);
      setEntries(es => [data, ...es]);
    } catch (e: any) {
      alert(e.response?.data?.message || '停止失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此记录？')) return;
    await timeEntryApi.delete(id);
    setEntries(es => es.filter(e => e.id !== id));
  };

  const totalMinutes = entries.reduce((sum, e) => sum + (e.duration || 0), 0) + elapsed;

  if (loading) return <div className="text-sm text-slate-400 text-center py-4">加载中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">时间追踪</h3>
          <p className="text-xs text-slate-400">总计: {formatDuration(totalMinutes)}</p>
        </div>
        {running ? (
          <Button variant="danger" size="sm" onClick={handleStop} leftIcon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>}>
            停止 ({formatDuration(elapsed)})
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={handleStart} isLoading={starting} leftIcon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}>
            开始计时
          </Button>
        )}
      </div>

      {running && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl animate-pulse-soft">
          <div className="flex items-center gap-2 text-red-600">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium">计时中: {formatDuration(elapsed)}</span>
          </div>
          <p className="text-xs text-red-500 mt-1">开始于 {formatTime(running.startTime)}</p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-slate-500">历史记录</h4>
          {entries.map(e => (
            <div key={e.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg group">
              <div className="flex items-center gap-2">
                {e.user && <Avatar src={e.user.avatar} fallback={e.user.avatar} size="xs" color={e.user.color} />}
                <div>
                  <p className="text-sm text-slate-700">{formatDuration(e.duration || 0)}</p>
                  <p className="text-xs text-slate-400">{formatTime(e.startTime)} - {e.endTime ? formatTime(e.endTime) : '进行中'}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(e.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 transition-opacity">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
