import React, { useCallback, useEffect } from 'react';
import Joyride, { CallBackProps, ACTIONS, EVENTS, STATUS, Step } from 'react-joyride';
import { useOnboardingStore } from '../stores/onboardingStore';
import { userApi } from '../services/api';

const STEPS: Step[] = [
  {
    target: '#onboarding-new-task',
    title: '创建任务',
    content: '点击这里创建新任务，输入标题后可使用 AI 自动填充描述和子任务',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '#onboarding-kanban-column',
    title: '看板管理',
    content: '将任务卡片拖拽到不同列来更新状态，从「待处理」到「已完成」',
    placement: 'right',
  },
  {
    target: '#onboarding-settings',
    title: '团队设置',
    content: '在这里管理团队成员、邀请新成员加入，以及配置团队设置',
    placement: 'right',
  },
];

const JOYRIDE_STYLES = {
  options: {
    arrowColor: '#fff',
    backgroundColor: '#fff',
    overlayColor: 'rgba(0, 0, 0, 0.6)',
    primaryColor: '#001C3D',
    textColor: '#334155',
    spotlightShadow: '0 0 15px rgba(0, 0, 0, 0.3)',
    width: 380,
    zIndex: 10000,
  },
  buttonNext: { backgroundColor: '#001C3D', fontSize: '14px', fontWeight: 500, padding: '8px 16px', borderRadius: '8px' },
  buttonBack: { color: '#64748B', marginRight: 'auto', fontSize: '14px' },
  buttonSkip: { color: '#94A3B8', fontSize: '14px' },
  tooltip: { borderRadius: '12px', padding: '20px' },
  tooltipTitle: { fontSize: '18px', fontWeight: 600, marginBottom: '8px' },
  tooltipContent: { fontSize: '14px', lineHeight: '1.6' },
};

const LOCALE = { back: '上一步', close: '关闭', last: '开始使用', next: '下一步', skip: '跳过引导' };

interface Props { onComplete: () => void; }

export const OnboardingGuide: React.FC<Props> = ({ onComplete }) => {
  const { isRunning, stepIndex, startTour, setStepIndex, completeTour } = useOnboardingStore();

  useEffect(() => { startTour(); }, [startTour]);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isRunning) {
        await userApi.completeOnboarding();
        completeTour();
        onComplete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, completeTour, onComplete]);

  const handleCallback = useCallback(async (data: CallBackProps) => {
    const { action, index, status, type } = data;

    if ([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND].includes(type as typeof EVENTS.STEP_AFTER)) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as typeof STATUS.FINISHED)) {
      await userApi.completeOnboarding();
      completeTour();
      onComplete();
    }
  }, [setStepIndex, completeTour, onComplete]);

  return (
    <Joyride
      callback={handleCallback}
      continuous
      run={isRunning}
      stepIndex={stepIndex}
      steps={STEPS}
      showSkipButton
      showProgress
      hideCloseButton={false}
      scrollToFirstStep
      disableOverlayClose
      spotlightPadding={8}
      styles={JOYRIDE_STYLES}
      locale={LOCALE}
    />
  );
};
