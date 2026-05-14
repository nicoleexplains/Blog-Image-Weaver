
import React from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface LoaderProps {
  message: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Loader: React.FC<LoaderProps> = ({ message, size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-10 w-10',
    lg: 'h-16 w-16'
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center space-y-4 text-center"
    >
      <div className="relative">
        <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-500`} />
        <div className={`absolute inset-0 blur-xl bg-blue-500/20 animate-pulse ${sizeClasses[size]}`} />
      </div>
      {message && (
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">
          {message}
        </p>
      )}
    </motion.div>
  );
};
