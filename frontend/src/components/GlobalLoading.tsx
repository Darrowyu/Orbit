import React from 'react';
import { create } from 'zustand';

interface LoadingStore {
    isLoading: boolean;
    message: string;
    show: (message?: string) => void;
    hide: () => void;
}

export const useLoadingStore = create<LoadingStore>((set) => ({
    isLoading: false,
    message: '',
    show: (message = '加载中...') => set({ isLoading: true, message }),
    hide: () => set({ isLoading: false, message: '' }),
}));

export const GlobalLoading: React.FC = () => {
    const { isLoading, message } = useLoadingStore();
    if (!isLoading) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 flex items-center gap-4">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-700 font-medium">{message}</span>
            </div>
        </div>
    );
};

export default GlobalLoading;
