import { memo, ReactNode } from 'react';

interface MainContentProps {
  children: ReactNode;
}

export const MainContent = memo(function MainContent({ children }: MainContentProps) {
  return (
    <main className="flex-1 bg-[#FAFAFA] overflow-hidden">
      <div className="h-full">
        {children}
      </div>
    </main>
  );
});
