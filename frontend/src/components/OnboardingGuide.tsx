import React, { useState } from 'react';
import { Button } from './Button';
import { userApi } from '../services/api';

interface Props { onComplete: () => void; }

const steps = [
  { title: '创建任务', desc: '点击右上角「新建任务」按钮，输入标题后可使用 AI 自动填充描述和子任务', icon: '📝' },
  { title: '拖拽管理', desc: '将任务卡片拖拽到不同列来更新状态，从「待处理」到「已完成」', icon: '🎯' },
  { title: '团队协作', desc: '为任务指派负责人，团队成员可实时看到任务变化', icon: '👥' },
];

export const OnboardingGuide: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const handleNext = async () => {
    if (step < steps.length - 1) setStep(step + 1);
    else {
      await userApi.completeOnboarding();
      onComplete();
    }
  };

  const handleSkip = async () => {
    await userApi.completeOnboarding();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 mx-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            {steps.map((_, i) => (
              <div key={i} className={`w-8 h-1 rounded-full transition-colors ${i <= step ? 'bg-indigo-500' : 'bg-gray-200'}`} />
            ))}
          </div>
          <button onClick={handleSkip} className="text-gray-400 hover:text-gray-600 text-sm">跳过引导</button>
        </div>
        <div className="text-center py-8">
          <div className="text-6xl mb-6">{steps[step].icon}</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">{steps[step].title}</h3>
          <p className="text-gray-500 text-lg">{steps[step].desc}</p>
        </div>
        <div className="flex gap-3">
          {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)} className="flex-1">上一步</Button>}
          <Button onClick={handleNext} className="flex-1">{step === steps.length - 1 ? '开始使用' : '下一步'}</Button>
        </div>
      </div>
    </div>
  );
};
