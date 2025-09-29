import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, Alert, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { captureRef } from 'react-native-view-shot';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { db, storage } from '../firebase';
import { useAuth } from '../AuthContext';

const StudentScreen = ({ navigation }) => {
  const { role } = useAuth();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [form, setForm] = useState({
    name: '',
    photo: null,
    dob: '',
    class: '',
    section: '',
    rollNo: '',
    parentName: '',
    parentPhone: '',
    address: '',
    aadhar: '',
    bloodGroup: '',
    emergencyContact: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const q = query(collection(db, 'students'));
      const querySnapshot = await getDocs(q);
      const studentList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(studentList);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch students');
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

  const saveStudent = async () => {
    if (!form.name || !form.class) {
      Alert.alert('Error', 'Name and Class are required');
      return;
    }

    try {
      let photoUrl = '';
      if (form.photo) {
        const response = await fetch(form.photo);
        const blob = await response.blob();
        const storageRef = ref(storage, `photos/${Date.now()}.jpg`);
        await uploadBytes(storageRef, blob);
        photoUrl = await getDownloadURL(storageRef);
      }

      const studentData = { ...form, photo: photoUrl };

      if (editingId) {
        await updateDoc(doc(db, 'students', editingId), studentData);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'students'), studentData);
      }

      fetchStudents();
      setForm({
        name: '',
        photo: null,
        dob: '',
        class: '',
        section: '',
        rollNo: '',
        parentName: '',
        parentPhone: '',
        address: '',
        aadhar: '',
        bloodGroup: '',
        emergencyContact: '',
      });
      setIsAdding(false);
      Alert.alert('Success', 'Student saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save student');
    }
  };

  const editStudent = (student) => {
    setForm(student);
    setEditingId(student.id);
    setIsAdding(true);
  };

  const deleteStudent = async (id) => {
    Alert.alert('Confirm', 'Delete this student?', [
      { text: 'Cancel' },
      { text: 'Delete', onPress: async () => {
        await deleteDoc(doc(db, 'students', id));
        fetchStudents();
      }},
    ]);
  };

  const generateIDCard = async (student) => {
    const html = `
      <html>
        <body style="font-family: Arial; text-align: center; padding: 20px;">
          <h1>Student ID Card</h1>
          ${student.photo ? `<img src="${student.photo}" style="width: 100px; height: 100px; border-radius: 50%;">` : ''}
          <h2>${student.name}</h2>
          <p>Class: ${student.class} - ${student.section}</p>
          <p>Roll No: ${student.rollNo}</p>
          <p>DOB: ${student.dob}</p>
          <p>Blood Group: ${student.bloodGroup}</p>
          <p>Emergency: ${student.emergencyContact}</p>
        </body>
      </html>
    `;

    await Print.printToFileAsync({ html });
    // For sharing or printing, use expo-sharing or expo-print
    if (await Sharing.isAvailableAsync()) {
      Sharing.shareAsync('idcard.pdf'); // Placeholder - actual file path needed
    }
  };

  const filteredStudents = students.filter(s => 
    (selectedClass === 'All' || s.class === selectedClass) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || s.rollNo.includes(search))
  );

  if (role !== 'admin' && role !== 'teacher') {
    return (
      <View style={styles.container}>
        <Text>Access Denied</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Student Management</Text>

      <TextInput
        style={styles.input}
        placeholder="Search by name or roll no"
        value={search}
        onChangeText={setSearch}
      />

      <TextInput
        style={styles.input}
        placeholder="Class"
        value={selectedClass}
        onChangeText={setSelectedClass}
      />

      <FlatList
        data={filteredStudents}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.studentItem}>
            {item.photo && <Image source={{ uri: item.photo }} style={styles.photo} />}
            <Text>{item.name} - {item.class} {item.section} - Roll: {item.rollNo}</Text>
            <Button title="Edit" onPress={() => editStudent(item)} />
            <Button title="Delete" onPress={() => deleteStudent(item.id)} />
            <Button title="ID Card" onPress={() => generateIDCard(item)} />
          </View>
        )}
      />

      <Button title={isAdding ? 'Cancel' : 'Add Student'} onPress={() => setIsAdding(!isAdding)} />

      {isAdding && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Name" value={form.name} onChangeText={text => setForm({...form, name: text})} />
          <TouchableOpacity onPress={handleImagePick}><Text>Pick Photo</Text></TouchableOpacity>
          <TextInput style={styles.input} placeholder="DOB" value={form.dob} onChangeText={text => setForm({...form, dob: text})} />
          <TextInput style={styles.input} placeholder="Class" value={form.class} onChangeText={text => setForm({...form, class: text})} />
          <TextInput style={styles.input} placeholder="Section" value={form.section} onChangeText={text => setForm({...form, section: text})} />
          <TextInput style={styles.input} placeholder="Roll No" value={form.rollNo} onChangeText={text => setForm({...form, rollNo: text})} />
          <TextInput style={styles.input} placeholder="Parent Name" value={form.parentName} onChangeText={text => setForm({...form, parentName: text})} />
          <TextInput style={styles.input} placeholder="Parent Phone" value={form.parentPhone} onChangeText={text => setForm({...form, parentPhone: text})} />
          <TextInput style={styles.input} placeholder="Address" value={form.address} onChangeText={text => setForm({...form, address: text})} multiline />
          <TextInput style={styles.input} placeholder="Aadhar" value={form.aadhar} onChangeText={text => setForm({...form, aadhar: text})} />
          <TextInput style={styles.input} placeholder="Blood Group" value={form.bloodGroup} onChangeText={text => setForm({...form, bloodGroup: text})} />
          <TextInput style={styles.input} placeholder="Emergency Contact" value={form.emergencyContact} onChangeText={text => setForm({...form, emergencyContact: text})} />
          <Button title="Save Student" onPress={saveStudent} />
        </View>
      )}
    </View>
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
  studentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  photo: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  form: {
    marginTop: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
});

export default StudentScreen;
