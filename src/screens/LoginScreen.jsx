import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useBiometric } from '../hooks/useBiometric';
import { authService } from '../services/api';

export function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { available: biometricAvailable, authenticate } = useBiometric();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier || !password) {
      setError('Completá todos los campos');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await authService.login(identifier, password);
      const { access_token } = res.data;
      await login(access_token, { username: identifier });
    } catch (e) {
      setError(e.response?.data?.detail || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    try {
      setBiometricLoading(true);
      setError('');
      const result = await authenticate();
      if (result) {
        await login(result.token, result.userData);
      } else {
        setError('Autenticación biométrica fallida');
      }
    } catch {
      setError('Error al autenticar con biometría');
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Unitree Control</Text>

      <TextInput
        style={styles.input}
        placeholder="Email o usuario"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading || biometricLoading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>Iniciar sesión</Text>
        }
      </TouchableOpacity>

      {biometricAvailable && (
        <TouchableOpacity
          style={styles.biometricButton}
          onPress={handleBiometric}
          disabled={loading || biometricLoading}
        >
          {biometricLoading
            ? <ActivityIndicator color="#000" />
            : <Text style={styles.biometricButtonText}>🔑 Ingresar con huella</Text>
          }
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>¿No tenés cuenta? Registrate</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  error: {
    color: 'red',
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#000',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  biometricButton: {
    borderWidth: 1,
    borderColor: '#000',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  biometricButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    textAlign: 'center',
    color: '#555',
    fontSize: 14,
  },
});
