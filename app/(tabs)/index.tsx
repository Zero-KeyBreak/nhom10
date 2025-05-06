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
import { Buffer } from 'buffer';

global.Buffer = global.Buffer || Buffer;

function initNfc() {
  NfcManager.start();
}

async function parseEmvResponse(tag) {
  const selectPpse = '00A404000E325041592E5359532E444446303100';
  const getProcessingOpts = '80A8000002830000';
  const aidList = ['A0000000031010', 'A0000000041010'];

  try {
    let resp = await NfcManager.transceive([...Buffer.from(selectPpse, 'hex')]);
    let hex = Buffer.from(resp).toString('hex');

    if (!hex.endsWith('9000')) return { pan: 'Không rõ', expiry: 'Không rõ', name: 'Không rõ' };

    let selectedAid = null;
    for (const aid of aidList) {
      resp = await NfcManager.transceive([...Buffer.from(`00A40400${(aid.length / 2).toString(16).padStart(2, '0')}${aid}`, 'hex')]);
      hex = Buffer.from(resp).toString('hex');
      if (hex.endsWith('9000')) {
        selectedAid = aid;
        break;
      }
    }

    if (!selectedAid) return { pan: 'Không rõ', expiry: 'Không rõ', name: 'Không rõ' };

    await NfcManager.transceive([...Buffer.from(getProcessingOpts, 'hex')]);

    const recordCommands = ['00B2010C00', '00B2021400', '00B2031C00'];
    let fullHex = '';
    for (let cmd of recordCommands) {
      try {
        const recordResp = await NfcManager.transceive([...Buffer.from(cmd, 'hex')]);
        const recordHex = Buffer.from(recordResp).toString('hex');
        if (recordHex.endsWith('9000')) {
          fullHex += recordHex;
        }
      } catch (_) {}
    }

    if (!fullHex) return { pan: 'Không rõ', expiry: 'Không rõ', name: 'Không rõ' };

    const panMatch = fullHex.match(/5A([0-9A-F]+?)(?:F|9000|$)/i);
    let pan = panMatch ? panMatch[1] : 'Không rõ';
    if (pan !== 'Không rõ') { 
      pan = pan.replace(/^08+/, '');
      pan = pan.replace(/F+$/, '')
    };

    const expMatch = fullHex.match(/5F24([0-9A-F]{4})/i);
    const expiry = expMatch ? `${expMatch[1].substring(0, 2)}/${expMatch[1].substring(2, 4)}` : 'Không rõ';

    const nameMatch = fullHex.match(/5F20([0-9A-F]+)/i);
    const name = nameMatch ? Buffer.from(nameMatch[1], 'hex').toString('utf-8').trim() : 'Không rõ';

    return { pan, expiry, name };
  } catch (err) {
    return { pan: 'Không đọc được', expiry: 'Không đọc được', name: 'Không đọc được' };
  }
}

export default function App() {
  const [text, setText] = useState('');
  const [tagData, setTagData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [serialNumber, setSerialNumber] = useState('');
  const [techList, setTechList] = useState('');
  const [ndefContent, setNdefContent] = useState('');

  useEffect(() => {
    initNfc();
  }, []);

  async function readNfc() {
    try {
      setLoading(true);
      setTagData(null);
      setSerialNumber('');
      setTechList('');
      setNdefContent('');

      await NfcManager.requestTechnology(NfcTech.IsoDep);
      const tag = await NfcManager.getTag();

      if (tag) {
        const techList = tag.techTypes?.join(', ') ?? 'Không xác định';
        const emvInfo = await parseEmvResponse(tag);

        if (emvInfo.pan === 'Không đọc được') {
          setTagData('Không thể đọc dữ liệu từ thẻ Visa/MasterCard.');
        } else {
          setSerialNumber(tag.id ?? 'Không xác định');
          setTechList(techList);
          setNdefContent(`Tên: ${emvInfo.name}\nSố thẻ: ${emvInfo.pan}\nHết hạn: ${emvInfo.expiry}`);
          setTagData('Đã đọc thẻ EMV (ngân hàng).');
        }
      } else {
        setTagData('Không phát hiện được thẻ.');
      }
    } catch (e) {
      setTagData('Lỗi khi đọc thẻ NFC.');
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
      await NfcManager.ndefHandler.writeNdefMessage(bytes);
      Alert.alert('✅ Ghi thành công');
    } catch (e) {
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
      await NfcManager.ndefHandler.writeNdefMessage([]);
      Alert.alert('🧹 Đã xóa nội dung trên thẻ');
      setTagData(null);
    } catch (e) {
      Alert.alert('❌ Xóa thất bại');
    } finally {
      await NfcManager.cancelTechnologyRequest();
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>💳 NFC EMV Reader</Text>

      <Text style={styles.subTitle}>🔄 Chức năng</Text>
      <View style={styles.actionRow}>
        <Button title="📥 Quét Thẻ" color="#007AFF" onPress={readNfc} />
        <Button title="🧹 Xóa Dữ Liệu" color="#FF3B30" onPress={clearNfc} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="✍️ Nhập nội dung cần ghi vào thẻ"
        value={text}
        onChangeText={setText}
      />
      <Button title="💾 Ghi NFC" color="#34C759" onPress={writeNfc} />

      {tagData && (
        <View style={styles.card}>
          <Text style={styles.resultLabel}>📄 Kết quả đọc:</Text>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>🔢 Số sê-ri:</Text>
            <Text style={styles.infoText}>{serialNumber}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>📶 Công nghệ hỗ trợ:</Text>
            <Text style={styles.infoText}>[{techList}]</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>💳 Số thẻ:</Text>
            <Text style={styles.infoText}>{ndefContent.split('\n')[1]}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>⏳ Hết hạn:</Text>
            <Text style={styles.infoText}>{ndefContent.split('\n')[2]}</Text>
          </View>
        </View>
      )}

      <Modal visible={loading} transparent animationType="fade">
        <View style={styles.modal}>
          <View style={styles.modalBox}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={{ marginTop: 12 }}>🔄 Đang xử lý NFC...</Text>
            <Button
              title="❌ Huỷ"
              onPress={async () => {
                await NfcManager.cancelTechnologyRequest();
                setLoading(false);
                setTagData('Đã huỷ thao tác.');
              }}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fdfdfd',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#007AFF',
    marginBottom: 20,
  },
  subTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    marginTop: 20,
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  infoItem: {
    marginBottom: 10,
  },
  infoLabel: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#333',
  },
  infoText: {
    fontSize: 16,
    color: '#555',
  },
  modal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});
