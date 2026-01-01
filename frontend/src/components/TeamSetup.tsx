import React, { useState } from 'react';
import { Button, Input, Card } from './ui';
import { useTeamStore } from '../stores/teamStore';

interface Props { onComplete: () => void; }

export const TeamSetup: React.FC<Props> = ({ onComplete }) => {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { createTeam, joinByCode } = useTeamStore();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      await createTeam(teamName);
      onComplete();
    } catch (err: any) {
      setError(err.response?.data?.message || '创建失败');
    } finally { setIsLoading(false); }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      await joinByCode(inviteCode.toUpperCase());
      onComplete();
    } catch (err: any) {
      setError(err.response?.data?.message || '加入失败，请检查邀请码');
    } finally { setIsLoading(false); }
  };

  if (mode === 'choose') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card variant="elevated" padding="lg" className="w-full max-w-md text-center animate-fade-in-up">
          <div className="w-16 h-16 bg-gradient-to-tr from-[#001C3D] to-[#0F4C81] rounded-2xl flex items-center justify-center text-white shadow-[var(--shadow-brand-lg)] mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">欢迎使用 Orbit</h2>
          <p className="text-slate-500 mb-8">开始协作之前，请先创建或加入一个团队</p>
          <div className="space-y-3">
            <Button onClick={() => setMode('create')} isFullWidth size="lg">创建新团队</Button>
            <Button onClick={() => setMode('join')} variant="secondary" isFullWidth size="lg">加入已有团队</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card variant="elevated" padding="lg" className="w-full max-w-md animate-fade-in-up">
        <button onClick={() => setMode('choose')} className="text-slate-400 hover:text-slate-600 mb-4 flex items-center text-sm transition-colors">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>返回
        </button>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">{mode === 'create' ? '创建新团队' : '加入团队'}</h2>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">{error}</div>}
        <form onSubmit={mode === 'create' ? handleCreate : handleJoin} className="space-y-4">
          {mode === 'create' ? (
            <Input label="团队名称" required value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="例如：产品研发组" size="lg" />
          ) : (
            <Input label="邀请码" required value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="输入8位邀请码" size="lg" className="uppercase tracking-widest text-center font-mono" maxLength={8} />
          )}
          <Button type="submit" isFullWidth size="lg" isLoading={isLoading}>{mode === 'create' ? '创建团队' : '加入团队'}</Button>
        </form>
      </Card>
    </div>
  );
};
