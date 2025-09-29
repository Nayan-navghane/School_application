import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, Alert, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { db, storage } from '../firebase';
import { useAuth } from '../AuthContext';

const TeacherScreen = ({ navigation }) => {
  const { role } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '',
    subject: '',
    photo: null,
    contact: '',
    joiningDate: '',
    salary: '',
  });
  const [timetable, setTimetable] = useState({
    monday: '',
    tuesday: '',
    wednesday: '',
    thursday: '',
    friday: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingSalary, setIsAddingSalary] = useState(false);
  const [salaryForm, setSalaryForm] = useState({
    teacherId: '',
    amount: '',
    date: '',
    paid: false,
  });

  useEffect(() => {
    fetchTeachers();
    fetchSalaries();
  }, []);

  const fetchTeachers = async () => {
    try {
      const q = query(collection(db, 'teachers'));
      const querySnapshot = await getDocs(q);
      const teacherList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeachers(teacherList);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch teachers');
    }
  };

  const fetchSalaries = async () => {
    try {
      const q = query(collection(db, 'salaries'));
      const querySnapshot = await getDocs(q);
      const salaryList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSalaries(salaryList);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch salaries');
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

  const saveTeacher = async () => {
    if (!form.name || !form.subject || !form.salary) {
      Alert.alert('Error', 'Name, Subject, and Salary are required');
      return;
    }

    try {
      let photoUrl = '';
      if (form.photo) {
        const response = await fetch(form.photo);
        const blob = await response.blob();
        const storageRef = ref(storage, `teacher-photos/${Date.now()}.jpg`);
        await uploadBytes(storageRef, blob);
        photoUrl = await getDownloadURL(storageRef);
      }

      const teacherData = { ...form, photo: photoUrl, timetable, joiningDate: new Date(form.joiningDate) };

      if (editingId) {
        await updateDoc(doc(db, 'teachers', editingId), teacherData);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'teachers'), teacherData);
      }

      fetchTeachers();
      setForm({
        name: '',
        subject: '',
        photo: null,
        contact: '',
        joiningDate: '',
        salary: '',
      });
      setTimetable({
        monday: '',
        tuesday: '',
        wednesday: '',
        thursday: '',
        friday: '',
      });
      setIsAdding(false);
      Alert.alert('Success', 'Teacher saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save teacher');
    }
  };

  const saveSalary = async () => {
    if (!salaryForm.teacherId || !salaryForm.amount || !salaryForm.date) {
      Alert.alert('Error', 'Teacher ID, Amount, and Date are required');
      return;
    }

    try {
      const salaryData = { ...salaryForm, date: new Date(salaryForm.date) };

      await addDoc(collection(db, 'salaries'), salaryData);

      fetchSalaries();
      setSalaryForm({ teacherId: '', amount: '', date: '', paid: false });
      setIsAddingSalary(false);
      Alert.alert('Success', 'Salary recorded successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to record salary');
    }
  };

  const editTeacher = (teacher) => {
    setForm(teacher);
    setTimetable(teacher.timetable || {});
    setEditingId(teacher.id);
    setIsAdding(true);
  };

  const deleteTeacher = async (id) => {
    Alert.alert('Confirm', 'Delete this teacher?', [
      { text: 'Cancel' },
      { text: 'Delete', onPress: async () => {
        await deleteDoc(doc(db, 'teachers', id));
        fetchTeachers();
      }},
    ]);
  };

  const markSalaryPaid = async (id) => {
    try {
      await updateDoc(doc(db, 'salaries', id), { paid: true });
      fetchSalaries();
      Alert.alert('Success', 'Salary marked as paid');
    } catch (error) {
      Alert.alert('Error', 'Failed to update salary status');
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || t.subject.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSalaries = salaries.filter(s => 
    s.teacherId.includes(search) || new Date(s.date).toDateString().includes(search)
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
      <Text style={styles.title}>Teacher Management</Text>

      <TextInput
        style={styles.input}
        placeholder="Search by name or subject"
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filteredTeachers}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.teacherItem}>
            {item.photo && <Image source={{ uri: item.photo }} style={styles.photo} />}
            <View style={styles.info}>
              <Text>{item.name} - {item.subject}</Text>
              <Text>Contact: {item.contact}</Text>
              <Text>Salary: ${item.salary}</Text>
              <Text>Joined: {item.joiningDate?.toDateString()}</Text>
              <Text>Timetable: {JSON.stringify(item.timetable)}</Text>
            </View>
            <Button title="Edit" onPress={() => editTeacher(item)} />
            <Button title="Delete" onPress={() => deleteTeacher(item.id)} />
          </View>
        )}
      />

      <FlatList
        data={filteredSalaries}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.salaryItem}>
            <Text>Teacher: {item.teacherId} - Amount: ${item.amount} on {item.date.toDateString()} - Paid: {item.paid ? 'Yes' : 'No'}</Text>
            {!item.paid && <Button title="Mark Paid" onPress={() => markSalaryPaid(item.id)} />}
          </View>
        )}
      />

      <Button title={isAdding ? 'Cancel' : 'Add Teacher'} onPress={() => setIsAdding(!isAdding)} />

      {isAdding && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Name" value={form.name} onChangeText={text => setForm({...form, name: text})} />
          <TouchableOpacity onPress={handleImagePick}><Text>Pick Photo</Text></TouchableOpacity>
          <TextInput style={styles.input} placeholder="Subject" value={form.subject} onChangeText={text => setForm({...form, subject: text})} />
          <TextInput style={styles.input} placeholder="Contact" value={form.contact} onChangeText={text => setForm({...form, contact: text})} />
          <TextInput style={styles.input} placeholder="Joining Date" value={form.joiningDate} onChangeText={text => setForm({...form, joiningDate: text})} />
          <TextInput style={styles.input} placeholder="Salary" value={form.salary} onChangeText={text => setForm({...form, salary: text})} keyboardType="numeric" />
          
          <Text>Timetable:</Text>
          <TextInput style={styles.input} placeholder="Monday" value={timetable.monday} onChangeText={text => setTimetable({...timetable, monday: text})} />
          <TextInput style={styles.input} placeholder="Tuesday" value={timetable.tuesday} onChangeText={text => setTimetable({...timetable, tuesday: text})} />
          <TextInput style={styles.input} placeholder="Wednesday" value={timetable.wednesday} onChangeText={text => setTimetable({...timetable, wednesday: text})} />
          <TextInput style={styles.input} placeholder="Thursday" value={timetable.thursday} onChangeText={text => setTimetable({...timetable, thursday: text})} />
          <TextInput style={styles.input} placeholder="Friday" value={timetable.friday} onChangeText={text => setTimetable({...timetable, friday: text})} />
          
          <Button title="Save Teacher" onPress={saveTeacher} />
        </View>
      )}

      <Button title={isAddingSalary ? 'Cancel' : 'Record Salary'} onPress={() => setIsAddingSalary(!isAddingSalary)} />

      {isAddingSalary && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Teacher ID" value={salaryForm.teacherId} onChangeText={text => setSalaryForm({...salaryForm, teacherId: text})} />
          <TextInput style={styles.input} placeholder="Amount" value={salaryForm.amount} onChangeText={text => setSalaryForm({...salaryForm, amount: text})} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Date" value={salaryForm.date} onChangeText={text => setSalaryForm({...salaryForm, date: text})} />
          <Button title="Save Salary" onPress={saveSalary} />
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
  teacherItem: {
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
  salaryItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  form: {
    marginTop: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
});

export default TeacherScreen;
