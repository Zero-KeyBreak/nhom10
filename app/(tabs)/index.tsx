import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Button,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

function initNfc() {
  NfcManager.start();
}

export default function App() {
  const [text, setText] = useState('');
  const [tagData, setTagData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initNfc();
  }, []);

  async function readNfc() {
    try {
      setLoading(true);
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();

      if (tag?.ndefMessage) {
        const decoded = tag.ndefMessage.map(r => Ndef.text.decodePayload(r.payload));
        const data = decoded.join('\n');

        // Kiểm tra loại thẻ
        if (data.includes('CCCD')) {
          setTagData(`📇 Thông tin CCCD:\n${data}`);
        } else if (data.includes('Visa') || data.includes('MasterCard')) {
          setTagData(`💳 Thông tin thẻ Visa/MasterCard:\n${data}`);
        } else {
          setTagData(`📄 Nội dung thẻ:\n${data}`);
        }
      } else {
        setTagData('Thẻ không có nội dung.');
      }
    } catch (e) {
      console.warn('Read error', e);
      setTagData('Lỗi khi đọc thẻ.');
    } finally {
      await NfcManager.cancelTechnologyRequest();
      setLoading(false);
    }
  }

  async function writeNfc() {
    if (!text.trim()) {
      Alert.alert('Vui lòng nhập nội dung');
      return;
    }

    try {
      setLoading(true);
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const bytes = Ndef.encodeMessage([Ndef.textRecord(text)]);
      await NfcManager.writeNdefMessage(bytes);
      Alert.alert('✅ Ghi thành công');
    } catch (e) {
      console.warn('Write error', e);
      Alert.alert('❌ Ghi lỗi');
    } finally {
      await NfcManager.cancelTechnologyRequest();
      setLoading(false);
    }
  }

  async function clearNfc() {
    try {
      setLoading(true);
      await NfcManager.requestTechnology(NfcTech.Ndef);
      // Ghi nội dung rỗng
      await NfcManager.writeNdefMessage([]);
      Alert.alert('🧹 Đã xóa nội dung trên thẻ');
      setTagData(null);
    } catch (e) {
      console.warn('Clear error', e);
      Alert.alert('❌ Xóa thất bại');
    } finally {
      await NfcManager.cancelTechnologyRequest();
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔄 NFC Manager</Text>

      <View style={styles.row}>
        <Button title="📥 Quét NFC" onPress={readNfc} />
        <Button title="🧹 Xóa thẻ" onPress={clearNfc} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Nhập nội dung cần ghi"
        value={text}
        onChangeText={setText}
      />

      <Button title="✍️ Ghi NFC" onPress={writeNfc} />

      {tagData && (
        <View style={styles.result}>
          <Text style={styles.resultLabel}>📄 Kết quả:</Text>
          <Text style={styles.resultText}>{tagData}</Text>
        </View>
      )}

      <Modal visible={loading} transparent>
        <View style={styles.modal}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 10 }}>Đang xử lý NFC...</Text>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  result: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  resultLabel: {
    fontWeight: 'bold',
    marginBottom: 6,
  },
  resultText: {
    fontSize: 16,
    color: '#333',
  },
  modal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
