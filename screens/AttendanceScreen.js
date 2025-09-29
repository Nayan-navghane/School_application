import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, Alert, StyleSheet, Switch, ScrollView } from 'react-native';
import { collection, addDoc, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';

const AttendanceScreen = ({ navigation }) => {
  const { role } = useAuth();
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('All');
  const [viewType, setViewType] = useState('student'); // 'student' or 'teacher'
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchStudents();
    fetchTeachers();
    fetchAttendance();
  }, [selectedDate, viewType]);

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

  const fetchAttendance = async () => {
    try {
      const q = query(collection(db, 'attendance'), where('date', '==', selectedDate));
      const querySnapshot = await getDocs(q);
      const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttendanceRecords(records);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch attendance');
    }
  };

  const markAttendance = async (id, status, type) => {
    if (role !== 'admin' && role !== 'teacher') {
      Alert.alert('Error', 'Only admin and teachers can mark attendance');
      return;
    }

    try {
      const attendanceData = {
        id,
        date: selectedDate,
        status,
        type, // 'student' or 'teacher'
        class: type === 'student' ? selectedClass : null,
      };

      const existing = attendanceRecords.find(r => r.id === id && r.date === selectedDate);
      if (existing) {
        await updateDoc(doc(db, 'attendance', existing.id), { status });
      } else {
        await addDoc(collection(db, 'attendance'), attendanceData);
      }

      fetchAttendance();
      Alert.alert('Success', `Attendance marked as ${status}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to mark attendance');
    }
  };

  const getAttendanceStatus = (id) => {
    const record = attendanceRecords.find(r => r.id === id && r.date === selectedDate);
    return record ? record.status : 'absent';
  };

  const filteredStudents = students.filter(s => 
    (selectedClass === 'All' || s.class === selectedClass) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || s.rollNo.includes(search))
  );

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAttendance = attendanceRecords.filter(r => 
    (viewType === r.type) &&
    (r.class === selectedClass || selectedClass === 'All') &&
    (r.id.includes(search) || new Date(r.date).toDateString().includes(search))
  );

  if (role === 'student' || role === 'parent') {
    // For students/parents, show only their attendance
    return (
      <View style={styles.container}>
        <Text>Personal Attendance View</Text>
        {/* Implement personal view logic */}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Attendance Management</Text>

      <TextInput
        style={styles.input}
        placeholder="Search"
        value={search}
        onChangeText={setSearch}
      />

      <TextInput
        style={styles.input}
        placeholder="Date (YYYY-MM-DD)"
        value={selectedDate}
        onChangeText={setSelectedDate}
      />

      <Button title="Student Attendance" onPress={() => setViewType('student')} />
      <Button title="Teacher Attendance" onPress={() => setViewType('teacher')} />

      {viewType === 'student' && (
        <TextInput
          style={styles.input}
          placeholder="Class"
          value={selectedClass}
          onChangeText={setSelectedClass}
        />
      )}

      {viewType === 'student' ? (
        <FlatList
          data={filteredStudents}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const status = getAttendanceStatus(item.id);
            return (
              <View style={styles.item}>
                <Text>{item.name} - {item.class} {item.rollNo}</Text>
                <Switch
                  value={status === 'present'}
                  onValueChange={(value) => markAttendance(item.id, value ? 'present' : 'absent', 'student')}
                />
                <Text>{status}</Text>
              </View>
            );
          }}
        />
      ) : (
        <FlatList
          data={filteredTeachers}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const status = getAttendanceStatus(item.id);
            return (
              <View style={styles.item}>
                <Text>{item.name} - {item.subject}</Text>
                <Switch
                  value={status === 'present'}
                  onValueChange={(value) => markAttendance(item.id, value ? 'present' : 'absent', 'teacher')}
                />
                <Text>{status}</Text>
              </View>
            );
          }}
        />
      )}

      <Text style={styles.subtitle}>Attendance Records for {selectedDate}</Text>

      <FlatList
        data={filteredAttendance}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.recordItem}>
            <Text>{item.type === 'student' ? 'Student' : 'Teacher'} {item.id}: {item.status} on {item.date}</Text>
            {item.class && <Text>Class: {item.class}</Text>}
          </View>
        )}
      />
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
  subtitle: {
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
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  recordItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});

export default AttendanceScreen;
