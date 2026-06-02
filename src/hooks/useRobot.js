import { useContext } from 'react';
import { RobotContext } from '../context/RobotContext';

export function useRobot() {
  const context = useContext(RobotContext);
  if (!context) throw new Error('useRobot debe usarse dentro de RobotProvider');
  return context;
}