import { AuthProvider } from './src/context/AuthContext';
import { RobotProvider } from './src/context/RobotContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <RobotProvider>
        <AppNavigator />
      </RobotProvider>
    </AuthProvider>
  );
}