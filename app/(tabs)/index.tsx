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
  ScrollView,
} from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

function initNfc() {
  NfcManager.start();
}

export default function App() {
  const [text, setText] = useState('');
  const [tagData, setTagData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [serialNumber, setSerialNumber] = useState('');
  const [techList, setTechList] = useState('');
  const [maxTransceiveLength, setMaxTransceiveLength] = useState('');
  const [ndefContent, setNdefContent] = useState('');

  useEffect(() => {
    initNfc();
  }, []);

  async function readNfc() {
    try {
      setLoading(true);
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();

      if (tag) {
        console.log('Tag details:', tag);
        // Lấy thông tin chi tiết từ thẻ
        const serialNumber = tag.id ? tag.id : 'Không xác định';
        const techList = tag.techTypes ? tag.techTypes.join(', ') : 'Không xác định';

        // Kiểm tra nội dung NDEF
        let ndefContent = 'Không tìm thấy dữ liệu';
        if (tag.ndefMessage) {
          const decoded = tag.ndefMessage.map(r => Ndef.text.decodePayload(r.payload));
          ndefContent = decoded.join('\n');
        }

        // Hiển thị thông tin chi tiết
        setSerialNumber(serialNumber);
        setTechList(techList);
        setNdefContent(ndefContent);
        setTagData('Thông tin thẻ đã được đọc.');
      } else {
        setTagData('Không tìm thấy dữ liệu trên thẻ.');
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
    <ScrollView contentContainerStyle={styles.container}>
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
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Số sê-ri:</Text>
            <Text style={styles.infoText}>{serialNumber}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Công nghệ hỗ trợ:</Text>
            <Text style={styles.infoText}>[{techList}]</Text>
          </View>
         
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Nội dung NDEF:</Text>
            <Text style={styles.infoText}>{ndefContent}</Text>
          </View>
        </View>
      )}

      <Modal visible={loading} transparent>
        <View style={styles.modal}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 10 }}>Đang xử lý NFC...</Text>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
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
  infoBox: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
  },
  infoLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoText: {
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
