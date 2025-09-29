import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView, TextInput, Button, Alert } from 'react-native';
import { AuthProvider, useAuth } from './AuthContext';

// Enhanced Login Screen
function LoginScreen({ navigation }) {
  const { login, loading: authLoading } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    try {
      await login(email, password);
      // Navigation will happen automatically via auth state change
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    }
  };

  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>School Management App</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Login" onPress={handleLogin} />
      <Button title="Signup" onPress={() => Alert.alert('Signup', 'Signup functionality can be implemented here')} />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

import StudentScreen from './screens/StudentScreen';
import FeeScreen from './screens/FeeScreen';
import TeacherScreen from './screens/TeacherScreen';
import AttendanceScreen from './screens/AttendanceScreen';
import ExamsScreen from './screens/ExamsScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Home Screen with role-based tabs
function HomeScreen() {
  const { user, role, logout } = useAuth();

  const Tab = createBottomTabNavigator();

  const getTabsForRole = () => {
    const commonTabs = [
      <Tab.Screen name="Home" component={() => <Text>Welcome, {user?.email} ({role})</Text>} options={{ tabBarLabel: 'Home' }} />,
      <Tab.Screen name="Settings" component={() => <Text>Settings Screen</Text>} options={{ tabBarLabel: 'Settings' }} />,
    ];

    if (role === 'admin') {
      return [
        <Tab.Screen name="Students" component={StudentScreen} options={{ tabBarLabel: 'Students', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-group" color={color} size={size} /> }} />,
        <Tab.Screen name="Fees" component={FeeScreen} options={{ tabBarLabel: 'Fees', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="cash" color={color} size={size} /> }} />,
        <Tab.Screen name="Teachers" component={TeacherScreen} options={{ tabBarLabel: 'Teachers', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="chalkboard-teacher" color={color} size={size} /> }} />,
        <Tab.Screen name="Attendance" component={AttendanceScreen} options={{ tabBarLabel: 'Attendance', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="calendar-check" color={color} size={size} /> }} />,
        <Tab.Screen name="Exams" component={ExamsScreen} options={{ tabBarLabel: 'Exams', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="book-open-page-variant" color={color} size={size} /> }} />,
        ...commonTabs,
      ];
    } else if (role === 'teacher') {
      return [
        <Tab.Screen name="Attendance" component={AttendanceScreen} options={{ tabBarLabel: 'Attendance', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="calendar-check" color={color} size={size} /> }} />,
        <Tab.Screen name="Exams" component={ExamsScreen} options={{ tabBarLabel: 'Exams', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="book-open-page-variant" color={color} size={size} /> }} />,
        ...commonTabs,
      ];
    } else if (role === 'student' || role === 'parent') {
      return [
        <Tab.Screen name="Attendance" component={AttendanceScreen} options={{ tabBarLabel: 'Attendance', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="calendar-check" color={color} size={size} /> }} />,
        <Tab.Screen name="Exams" component={ExamsScreen} options={{ tabBarLabel: 'Exams', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="book-open-page-variant" color={color} size={size} /> }} />,
        ...commonTabs,
      ];
    }
    return commonTabs;
  };

  return (
    <Tab.Navigator>
      {getTabsForRole()}
      <Tab.Screen name="Logout" component={() => <Button title="Logout" onPress={logout} />} options={{ tabBarButton: () => null }} />
    </Tab.Navigator>
  );
}

const Stack = createStackNavigator();

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
        ) : (
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginVertical: 10,
    width: '100%',
  },
});
