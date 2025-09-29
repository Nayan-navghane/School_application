import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Switch, Alert, StyleSheet, ScrollView, Image } from 'react-native';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { db, storage } from '../firebase';
import { useAuth } from '../AuthContext';

const SettingsScreen = ({ navigation }) => {
  const { role, user } = useAuth();
  const [schoolLogo, setSchoolLogo] = useState(null);
  const [theme, setTheme] = useState('light');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [adminSettings, setAdminSettings] = useState({
    allowStudentAccess: true,
    allowParentAccess: true,
  });
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'school'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setTheme(data.theme || 'light');
        setNotificationsEnabled(data.notificationsEnabled || true);
        setAdminSettings(data.adminSettings || { allowStudentAccess: true, allowParentAccess: true });
        setLogoUrl(data.logoUrl || '');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch settings');
    }
  };

  const handleLogoPick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setSchoolLogo(result.assets[0].uri);
      try {
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        const storageRef = ref(storage, `school-logo/${Date.now()}.jpg`);
        await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(storageRef);
        setLogoUrl(downloadUrl);
        saveSettings();
      } catch (error) {
        Alert.alert('Error', 'Failed to upload logo');
      }
    }
  };

  const saveSettings = async () => {
    if (role !== 'admin') {
      Alert.alert('Error', 'Only admin can change settings');
      return;
    }

    try {
      await updateDoc(doc(db, 'settings', 'school'), {
        theme,
        notificationsEnabled,
        adminSettings,
        logoUrl,
      });
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const toggleNotification = (value) => {
    setNotificationsEnabled(value);
    saveSettings();
  };

  if (role !== 'admin') {
    return (
      <View style={styles.container}>
        <Text>View Only - Admin Settings</Text>
        <Text>Theme: {theme}</Text>
        <Text>Notifications: {notificationsEnabled ? 'Enabled' : 'Disabled'}</Text>
        {logoUrl && <Image source={{ uri: logoUrl }} style={styles.logo} />}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>App Settings</Text>

      <Text>School Logo:</Text>
      <TouchableOpacity onPress={handleLogoPick}>
        <Text>Pick Logo</Text>
      </TouchableOpacity>
      {schoolLogo && <Image source={{ uri: schoolLogo }} style={styles.logo} />}
      {logoUrl && <Text>Current Logo URL: {logoUrl}</Text>}

      <Text>Theme:</Text>
      <TextInput
        style={styles.input}
        placeholder="Theme (light/dark)"
        value={theme}
        onChangeText={setTheme}
      />

      <Text>Notifications:</Text>
      <Switch value={notificationsEnabled} onValueChange={toggleNotification} />

      {role === 'admin' && (
        <View>
          <Text>Admin Settings:</Text>
          <Text>Allow Student Access: <Switch value={adminSettings.allowStudentAccess} onValueChange={(value) => setAdminSettings({...adminSettings, allowStudentAccess: value})} /></Text>
          <Text>Allow Parent Access: <Switch value={adminSettings.allowParentAccess} onValueChange={(value) => setAdminSettings({...adminSettings, allowParentAccess: value})} /></Text>
        </View>
      )}

      <Button title="Save Settings" onPress={saveSettings} />

      <Text style={styles.section}>User Roles & Permissions</Text>
      <Text>Current User: {user?.email} - Role: {role}</Text>
      {/* Add role management for admin */}
      {role === 'admin' && <Button title="Manage Roles" onPress={() => Alert.alert('Manage Roles', 'Implement role assignment here')} />}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  section: {
    fontSize: 18,
    marginTop: 20,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginVertical: 5,
    width: '100%',
  },
  logo: {
    width: 100,
    height: 100,
    marginVertical: 10,
  },
});

export default SettingsScreen;
