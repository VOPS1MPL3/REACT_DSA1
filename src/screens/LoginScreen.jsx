import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/api';

export function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

    <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
      {loading
        ? <ActivityIndicator color="#fff" />
        : <Text style={styles.buttonText}>Iniciar sesión</Text>
      }
    </TouchableOpacity>

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
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    textAlign: 'center',
    color: '#555',
    fontSize: 14,
  },
});