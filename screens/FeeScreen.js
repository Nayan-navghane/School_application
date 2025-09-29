import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, Alert, StyleSheet, Picker } from 'react-native';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';

const FeeScreen = ({ navigation }) => {
  const { role } = useAuth();
  const [feeStructures, setFeeStructures] = useState([]);
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [form, setForm] = useState({
    class: '',
    feeType: '',
    amount: '',
    dueDate: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    studentId: '',
    amount: '',
    date: '',
    mode: 'Cash',
  });
  const [editingId, setEditingId] = useState(null);
  const [isAddingFee, setIsAddingFee] = useState(false);
  const [isAddingPayment, setIsAddingPayment] = useState(false);

  useEffect(() => {
    fetchFeeStructures();
    fetchPayments();
  }, []);

  const fetchFeeStructures = async () => {
    try {
      const q = query(collection(db, 'feeStructures'));
      const querySnapshot = await getDocs(q);
      const feeList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFeeStructures(feeList);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch fee structures');
    }
  };

  const fetchPayments = async () => {
    try {
      const q = query(collection(db, 'payments'));
      const querySnapshot = await getDocs(q);
      const paymentList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPayments(paymentList);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch payments');
    }
  };

  const saveFeeStructure = async () => {
    if (!form.class || !form.feeType || !form.amount) {
      Alert.alert('Error', 'Class, Fee Type, and Amount are required');
      return;
    }

    try {
      const feeData = { ...form, dueDate: new Date(form.dueDate) };

      if (editingId) {
        await updateDoc(doc(db, 'feeStructures', editingId), feeData);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'feeStructures'), feeData);
      }

      fetchFeeStructures();
      setForm({ class: '', feeType: '', amount: '', dueDate: '' });
      setIsAddingFee(false);
      Alert.alert('Success', 'Fee structure saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save fee structure');
    }
  };

  const savePayment = async () => {
    if (!paymentForm.studentId || !paymentForm.amount || !paymentForm.date) {
      Alert.alert('Error', 'Student ID, Amount, and Date are required');
      return;
    }

    try {
      const paymentData = { ...paymentForm, date: new Date(paymentForm.date) };

      await addDoc(collection(db, 'payments'), paymentData);

      fetchPayments();
      setPaymentForm({ studentId: '', amount: '', date: '', mode: 'Cash' });
      setIsAddingPayment(false);
      Alert.alert('Success', 'Payment recorded successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to record payment');
    }
  };

  const editFeeStructure = (fee) => {
    setForm(fee);
    setEditingId(fee.id);
    setIsAddingFee(true);
  };

  const deleteFeeStructure = async (id) => {
    Alert.alert('Confirm', 'Delete this fee structure?', [
      { text: 'Cancel' },
      { text: 'Delete', onPress: async () => {
        await deleteDoc(doc(db, 'feeStructures', id));
        fetchFeeStructures();
      }},
    ]);
  };

  const generateReceipt = async (payment) => {
    const html = `
      <html>
        <body style="font-family: Arial; text-align: center; padding: 20px;">
          <h1>Fee Receipt</h1>
          <p>Student ID: ${payment.studentId}</p>
          <p>Amount Paid: $${payment.amount}</p>
          <p>Date: ${payment.date.toDateString()}</p>
          <p>Mode: ${payment.mode}</p>
          <p>Receipt ID: ${payment.id}</p>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    }
  };

  const filteredFees = feeStructures.filter(f => 
    (selectedClass === 'All' || f.class === selectedClass) &&
    (f.feeType.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredPayments = payments.filter(p => 
    p.studentId.includes(search) || new Date(p.date).toDateString().includes(search)
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
      <Text style={styles.title}>Fee Management</Text>

      <TextInput
        style={styles.input}
        placeholder="Search fees or payments"
        value={search}
        onChangeText={setSearch}
      />

      <Picker
        selectedValue={selectedClass}
        onValueChange={setSelectedClass}
        style={styles.picker}
      >
        <Picker.Item label="All Classes" value="All" />
        <Picker.Item label="Class 1" value="Class 1" />
        <Picker.Item label="Class 2" value="Class 2" />
        {/* Add more classes as needed */}
      </Picker>

      <FlatList
        data={filteredFees}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>{item.class} - {item.feeType}: ${item.amount} (Due: {item.dueDate.toDateString()})</Text>
            <Button title="Edit" onPress={() => editFeeStructure(item)} />
            <Button title="Delete" onPress={() => deleteFeeStructure(item.id)} />
          </View>
        )}
        style={styles.list}
      />

      <FlatList
        data={filteredPayments}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>Student: {item.studentId} - Paid: ${item.amount} on {item.date.toDateString()} ({item.mode})</Text>
            <Button title="Receipt" onPress={() => generateReceipt(item)} />
          </View>
        )}
        style={styles.list}
      />

      <Button title={isAddingFee ? 'Cancel' : 'Add Fee Structure'} onPress={() => setIsAddingFee(!isAddingFee)} />

      {isAddingFee && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Class" value={form.class} onChangeText={text => setForm({...form, class: text})} />
          <TextInput style={styles.input} placeholder="Fee Type" value={form.feeType} onChangeText={text => setForm({...form, feeType: text})} />
          <TextInput style={styles.input} placeholder="Amount" value={form.amount} onChangeText={text => setForm({...form, amount: text})} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Due Date" value={form.dueDate} onChangeText={text => setForm({...form, dueDate: text})} />
          <Button title="Save Fee" onPress={saveFeeStructure} />
        </View>
      )}

      <Button title={isAddingPayment ? 'Cancel' : 'Record Payment'} onPress={() => setIsAddingPayment(!isAddingPayment)} />

      {isAddingPayment && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Student ID" value={paymentForm.studentId} onChangeText={text => setPaymentForm({...paymentForm, studentId: text})} />
          <TextInput style={styles.input} placeholder="Amount" value={paymentForm.amount} onChangeText={text => setPaymentForm({...paymentForm, amount: text})} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Date" value={paymentForm.date} onChangeText={text => setPaymentForm({...paymentForm, date: text})} />
          <Picker
            selectedValue={paymentForm.mode}
            onValueChange={text => setPaymentForm({...paymentForm, mode: text})}
          >
            <Picker.Item label="Cash" value="Cash" />
            <Picker.Item label="Card" value="Card" />
            <Picker.Item label="Online" value="Online" />
          </Picker>
          <Button title="Save Payment" onPress={savePayment} />
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
  picker: {
    height: 50,
    width: '100%',
  },
  list: {
    height: 200,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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

export default FeeScreen;
