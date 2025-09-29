import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, Alert, StyleSheet, ScrollView } from 'react-native';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { db, storage } from '../firebase';
import { useAuth } from '../AuthContext';

const ExamsScreen = ({ navigation }) => {
  const { role } = useAuth();
  const [exams, setExams] = useState([]);
  const [marks, setMarks] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [form, setForm] = useState({
    class: '',
    subject: '',
    date: '',
    paper: null,
  });
  const [marksForm, setMarksForm] = useState({
    studentId: '',
    examId: '',
    marks: '',
    total: 100,
  });
  const [editingId, setEditingId] = useState(null);
  const [isAddingExam, setIsAddingExam] = useState(false);
  const [isAddingMarks, setIsAddingMarks] = useState(false);

  useEffect(() => {
    fetchExams();
    fetchMarks();
  }, []);

  const fetchExams = async () => {
    try {
      const q = query(collection(db, 'exams'));
      const querySnapshot = await getDocs(q);
      const examList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExams(examList);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch exams');
    }
  };

  const fetchMarks = async () => {
    try {
      const q = query(collection(db, 'marks'));
      const querySnapshot = await getDocs(q);
      const marksList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMarks(marksList);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch marks');
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: false,
    });

    if (result.type !== 'cancel') {
      setForm({ ...form, paper: result.uri });
    }
  };

  const saveExam = async () => {
    if (!form.class || !form.subject || !form.date) {
      Alert.alert('Error', 'Class, Subject, and Date are required');
      return;
    }

    try {
      let paperUrl = '';
      if (form.paper) {
        const response = await fetch(form.paper);
        const blob = await response.blob();
        const storageRef = ref(storage, `exam-papers/${Date.now()}.pdf`);
        await uploadBytes(storageRef, blob);
        paperUrl = await getDownloadURL(storageRef);
      }

      const examData = { ...form, paper: paperUrl, date: new Date(form.date) };

      if (editingId) {
        await updateDoc(doc(db, 'exams', editingId), examData);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'exams'), examData);
      }

      fetchExams();
      setForm({ class: '', subject: '', date: '', paper: null });
      setIsAddingExam(false);
      Alert.alert('Success', 'Exam saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save exam');
    }
  };

  const saveMarks = async () => {
    if (!marksForm.studentId || !marksForm.examId || marksForm.marks === '') {
      Alert.alert('Error', 'Student ID, Exam ID, and Marks are required');
      return;
    }

    try {
      const marksData = { ...marksForm };

      await addDoc(collection(db, 'marks'), marksData);

      fetchMarks();
      setMarksForm({ studentId: '', examId: '', marks: '', total: 100 });
      setIsAddingMarks(false);
      Alert.alert('Success', 'Marks entered successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to enter marks');
    }
  };

  const editExam = (exam) => {
    setForm(exam);
    setEditingId(exam.id);
    setIsAddingExam(true);
  };

  const deleteExam = async (id) => {
    Alert.alert('Confirm', 'Delete this exam?', [
      { text: 'Cancel' },
      { text: 'Delete', onPress: async () => {
        await deleteDoc(doc(db, 'exams', id));
        fetchExams();
      }},
    ]);
  };

  const downloadPaper = async (paperUrl) => {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(paperUrl);
    }
  };

  const generateReportCard = async (studentId) => {
    const studentMarks = marks.filter(m => m.studentId === studentId);
    const totalMarks = studentMarks.reduce((sum, m) => sum + parseInt(m.marks), 0);
    const totalExams = studentMarks.length;
    const average = totalExams > 0 ? totalMarks / totalExams : 0;

    const html = `
      <html>
        <body style="font-family: Arial; text-align: center; padding: 20px;">
          <h1>Report Card</h1>
          <p>Student ID: ${studentId}</p>
          <p>Total Marks: ${totalMarks} / ${totalExams * 100}</p>
          <p>Average: ${average.toFixed(2)}%</p>
          <h3>Marks Details:</h3>
          ${studentMarks.map(m => `<p>${m.examId}: ${m.marks}/${m.total}</p>`).join('')}
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    }
  };

  const filteredExams = exams.filter(e => 
    (selectedClass === 'All' || e.class === selectedClass) &&
    (e.subject.toLowerCase().includes(search.toLowerCase()) || e.date.toDateString().includes(search))
  );

  const filteredMarks = marks.filter(m => 
    m.studentId.includes(search) || m.examId.includes(search)
  );

  if (role !== 'admin' && role !== 'teacher') {
    return (
      <View style={styles.container}>
        <Text>Access Denied</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Exams & Papers Management</Text>

      <TextInput
        style={styles.input}
        placeholder="Search by class, subject, or date"
        value={search}
        onChangeText={setSearch}
      />

      <TextInput
        style={styles.input}
        placeholder="Class"
        value={selectedClass}
        onChangeText={setSelectedClass}
      />

      <TextInput
        style={styles.input}
        placeholder="Subject"
        value={selectedSubject}
        onChangeText={setSelectedSubject}
      />

      <FlatList
        data={filteredExams}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.examItem}>
            <Text>{item.class} - {item.subject} on {item.date.toDateString()}</Text>
            {item.paper && <Button title="Download Paper" onPress={() => downloadPaper(item.paper)} />}
            <Button title="Edit" onPress={() => editExam(item)} />
            <Button title="Delete" onPress={() => deleteExam(item.id)} />
          </View>
        )}
        style={styles.list}
      />

      <FlatList
        data={filteredMarks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.marksItem}>
            <Text>Student: {item.studentId} - Exam: {item.examId} - Marks: {item.marks}/{item.total}</Text>
          </View>
        )}
        style={styles.list}
      />

      <Button title={isAddingExam ? 'Cancel' : 'Add Exam'} onPress={() => setIsAddingExam(!isAddingExam)} />

      {isAddingExam && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Class" value={form.class} onChangeText={text => setForm({...form, class: text})} />
          <TextInput style={styles.input} placeholder="Subject" value={form.subject} onChangeText={text => setForm({...form, subject: text})} />
          <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" value={form.date} onChangeText={text => setForm({...form, date: text})} />
          <TouchableOpacity onPress={pickDocument}><Text>Upload Exam Paper (PDF)</Text></TouchableOpacity>
          {form.paper && <Text>Paper selected: {form.paper.split('/').pop()}</Text>}
          <Button title="Save Exam" onPress={saveExam} />
        </View>
      )}

      <Button title={isAddingMarks ? 'Cancel' : 'Enter Marks'} onPress={() => setIsAddingMarks(!isAddingMarks)} />

      {isAddingMarks && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Student ID" value={marksForm.studentId} onChangeText={text => setMarksForm({...marksForm, studentId: text})} />
          <TextInput style={styles.input} placeholder="Exam ID" value={marksForm.examId} onChangeText={text => setMarksForm({...marksForm, examId: text})} />
          <TextInput style={styles.input} placeholder="Marks Obtained" value={marksForm.marks} onChangeText={text => setMarksForm({...marksForm, marks: text})} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Total Marks" value={marksForm.total.toString()} onChangeText={text => setMarksForm({...marksForm, total: parseInt(text) || 100})} keyboardType="numeric" />
          <Button title="Save Marks" onPress={saveMarks} />
        </View>
      )}

      <Button title="Generate Report Card" onPress={() => generateReportCard('example-student-id')} /> {/* Replace with actual student ID */}
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
  list: {
    height: 150,
  },
  examItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  marksItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  form: {
    marginTop: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
});

export default ExamsScreen;
