import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Pressable,
  Linking,
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';

export default function QRScannerScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const isFocused = useIsFocused(); // 👈 Theo dõi xem màn hình có đang active

  // Yêu cầu quyền camera
  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Reset scanned khi quay lại tab
  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      return () => {
        setScanned(false);
      };
    }, [])
  );

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    setQrData(data);
    Alert.alert('✅ Mã QR đã quét', data, [
      {
        text: 'Mở nếu là liên kết',
        onPress: () => {
          if (data.startsWith('http')) Linking.openURL(data);
        },
      },
      {
        text: 'Quét lại',
        onPress: () => setScanned(false),
      },
    ]);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.center}>
        <Text>Đang kiểm tra quyền truy cập camera...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text>Bạn cần cấp quyền sử dụng camera để quét mã QR.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📷 Quét mã QR</Text>

      <View style={styles.scannerContainer}>
        {isFocused && (
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
        )}
      </View>

      {qrData && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>📄 Nội dung đã quét:</Text>
          <Text style={styles.resultText}>{qrData}</Text>

          <Pressable style={styles.button} onPress={() => setScanned(false)}>
            <Text style={styles.buttonText}>🔁 Quét lại</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#f9f9f9',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  scannerContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#007BFF',
    marginBottom: 20,
  },
  resultBox: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
