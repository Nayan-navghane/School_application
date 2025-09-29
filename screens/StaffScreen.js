import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, Alert, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { db, storage } from '../firebase';
import { useAuth } from '../AuthContext';

const StaffScreen = ({ navigation }) => {
  const { role } = useAuth();
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '',
    role: '',
    photo: null,
    contact: '',
    joiningDate: '',
    salary: '',
    schedule: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const q = query(collection(db, 'staff'));
      const querySnapshot = await getDocs(q);
      const staffList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStaff(staffList);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch staff');
    }
  };

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setForm({ ...form, photo: result.assets[0].uri });
    }
  };

  const saveStaff = async () => {
    if (!form.name || !form.role || !form.salary) {
      Alert.alert('Error', 'Name, Role, and Salary are required');
      return;
    }

    try {
      let photoUrl = '';
      if (form.photo) {
        const response = await fetch(form.photo);
        const blob = await response.blob();
        const storageRef = ref(storage, `staff-photos/${Date.now()}.jpg`);
        await uploadBytes(storageRef, blob);
        photoUrl = await getDownloadURL(storageRef);
      }

      const staffData = { ...form, photo: photoUrl, joiningDate: new Date(form.joiningDate) };

      if (editingId) {
        await updateDoc(doc(db, 'staff', editingId), staffData);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'staff'), staffData);
      }

      fetchStaff();
      setForm({
        name: '',
        role: '',
        photo: null,
        contact: '',
        joiningDate: '',
        salary: '',
        schedule: '',
      });
      setIsAdding(false);
      Alert.alert('Success', 'Staff member saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save staff member');
    }
  };

  const editStaff = (member) => {
    setForm(member);
    setEditingId(member.id);
    setIsAdding(true);
  };

  const deleteStaff = async (id) => {
    Alert.alert('Confirm', 'Delete this staff member?', [
      { text: 'Cancel' },
      { text: 'Delete', onPress: async () => {
        await deleteDoc(doc(db, 'staff', id));
        fetchStaff();
      }},
    ]);
  };

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || s.role.toLowerCase().includes(search.toLowerCase())
  );

  if (role !== 'admin') {
    return (
      <View style={styles.container}>
        <Text>Access Denied</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Staff Management</Text>

      <TextInput
        style={styles.input}
        placeholder="Search by name or role"
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filteredStaff}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.staffItem}>
            {item.photo && <Image source={{ uri: item.photo }} style={styles.photo} />}
            <View style={styles.info}>
              <Text>{item.name} - {item.role}</Text>
              <Text>Contact: {item.contact}</Text>
              <Text>Salary: ${item.salary}</Text>
              <Text>Joined: {item.joiningDate?.toDateString()}</Text>
              <Text>Schedule: {item.schedule}</Text>
            </View>
            <Button title="Edit" onPress={() => editStaff(item)} />
            <Button title="Delete" onPress={() => deleteStaff(item.id)} />
          </View>
        )}
      />

      <Button title={isAdding ? 'Cancel' : 'Add Staff'} onPress={() => setIsAdding(!isAdding)} />

      {isAdding && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Name" value={form.name} onChangeText={text => setForm({...form, name: text})} />
          <TouchableOpacity onPress={handleImagePick}><Text>Pick Photo</Text></TouchableOpacity>
          <TextInput style={styles.input} placeholder="Role" value={form.role} onChangeText={text => setForm({...form, role: text})} />
          <TextInput style={styles.input} placeholder="Contact" value={form.contact} onChangeText={text => setForm({...form, contact: text})} />
          <TextInput style={styles.input} placeholder="Joining Date" value={form.joiningDate} onChangeText={text => setForm({...form, joiningDate: text})} />
          <TextInput style={styles.input} placeholder="Salary" value={form.salary} onChangeText={text => setForm({...form, salary: text})} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Schedule" value={form.schedule} onChangeText={text => setForm({...form, schedule: text})} multiline />
          <Button title="Save Staff" onPress={saveStaff} />
        </View>
      )}
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
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginVertical: 5,
    width: '100%',
  },
  staffItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  photo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  info: {
    flex: 1,
  },
  form: {
    marginTop: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
});

export default StaffScreen;
