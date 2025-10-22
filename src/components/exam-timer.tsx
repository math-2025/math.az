"use client";

import { useState, useEffect } from 'react';
import { parseISO, differenceInSeconds } from 'date-fns';
import { Card, CardContent } from './ui/card';
import { Clock } from 'lucide-react';

type ExamTimerProps = {
  endTime: string;
  onTimeUp: () => void;
};

export function ExamTimer({ endTime, onTimeUp }: ExamTimerProps) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const end = parseISO(endTime);
    const calculateRemaining = () => differenceInSeconds(end, new Date());
    
    setRemaining(calculateRemaining());

    const interval = setInterval(() => {
      const secondsLeft = calculateRemaining();
      setRemaining(secondsLeft);
      if (secondsLeft <= 0) {
        clearInterval(interval);
        onTimeUp();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, onTimeUp]);

  const formatTime = (totalSeconds: number) => {
    if (totalSeconds < 0) totalSeconds = 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const isCritical = remaining !== null && remaining <= 300; // 5 minutes

  return (
    <Card className={`transition-colors ${isCritical ? 'bg-destructive/10 border-destructive' : ''}`}>
      <CardContent className="p-4">
        <div className={`flex items-center justify-center font-mono text-2xl font-bold ${isCritical ? 'text-destructive' : 'text-primary'}`}>
          <Clock className="mr-3 h-6 w-6" />
          <span>
            {remaining !== null ? formatTime(remaining) : 'Yüklənir...'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
