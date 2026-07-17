import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

// Import expo-live-activity một cách an toàn để tránh crash trên Expo Go
let LiveActivity = null;
try {
  LiveActivity = require('expo-live-activity');
} catch (e) {
  console.log('Thư viện expo-live-activity chưa được build hoặc không khả dụng trong môi trường này.');
}

// Cấu hình hiển thị thông báo khi ứng dụng đang mở ở foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [count, setCount] = useState(0);
  const [activityId, setActivityId] = useState(null);
  const [isLiveActivitySupported, setIsLiveActivitySupported] = useState(false);

  // Kiểm tra khả năng hỗ trợ Live Activities (Dynamic Island)
  useEffect(() => {
    if (Platform.OS === 'ios' && LiveActivity && typeof LiveActivity.startActivity === 'function') {
      setIsLiveActivitySupported(true);
    } else {
      setIsLiveActivitySupported(false);
    }
  }, []);

  // Yêu cầu quyền thông báo khi khởi chạy ứng dụng
  useEffect(() => {
    async function requestPermissions() {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.log('Quyền thông báo bị từ chối.');
        }
      } catch (error) {
        console.log('Lỗi yêu cầu quyền thông báo:', error);
      }
    }
    requestPermissions();
  }, []);

  // Lắng nghe các thay đổi về trạng thái của Live Activity (nếu được hỗ trợ)
  useEffect(() => {
    if (!isLiveActivitySupported || !LiveActivity) return;

    try {
      const subscription = LiveActivity.addActivityUpdatesListener(
        ({ activityID, activityState }) => {
          console.log(`Live Activity ${activityID} chuyển trạng thái sang: ${activityState}`);
          if (activityState === 'ended' || activityState === 'dismissed') {
            setActivityId(null);
          }
        }
      );
      return () => subscription?.remove();
    } catch (e) {
      console.log('Không thể đăng ký lắng nghe cập nhật Live Activity:', e);
    }
  }, [isLiveActivitySupported]);

  // Hàm cập nhật số đếm và đồng bộ lên Dynamic Island nếu đang chạy
  const updateCount = async (newCount) => {
    setCount(newCount);

    if (activityId && isLiveActivitySupported && LiveActivity) {
      try {
        const state = {
          title: `Số đếm: ${newCount}`,
          subtitle: newCount % 2 === 0 ? 'Số chẵn • Tiến trình 🟣' : 'Số lẻ • Tiến trình 🟡',
          progressBar: {
            progress: Math.min(Math.max(newCount / 100, 0), 1), // Lượng tiến trình từ 0 đến 1 dựa trên mốc 100
          },
          imageName: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100',
        };
        await LiveActivity.updateActivity(activityId, state);
      } catch (e) {
        console.log('Lỗi cập nhật Dynamic Island:', e);
      }
    }
  };

  // Khởi chạy Live Activity (Dynamic Island)
  const startDynamicIsland = async () => {
    if (!isLiveActivitySupported || !LiveActivity) {
      Alert.alert(
        'Không hỗ trợ Dynamic Island',
        'Thiết bị hoặc ứng dụng Expo Go hiện tại không hỗ trợ Dynamic Island thật.\n\nBạn cần build thành file IPA (Dev Client) để trải nghiệm tính năng này.'
      );
      return;
    }

    try {
      const state = {
        title: `Số đếm: ${count}`,
        subtitle: count % 2 === 0 ? 'Số chẵn • Tiến trình 🟣' : 'Số lẻ • Tiến trình 🟡',
        progressBar: {
          progress: Math.min(Math.max(count / 100, 0), 1),
        },
        imageName: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100',
        dynamicIslandImageName: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=50',
      };

      const config = {
        backgroundColor: '0F0F16',
        titleColor: '#FF6B6B',
        subtitleColor: '#FFFFFF90',
        progressViewTint: '#4D96FF',
        progressViewLabelColor: '#FFFFFF',
        timerType: 'circular',
      };

      const id = await LiveActivity.startActivity(state, config, 1.0);
      if (id) {
        setActivityId(id);
        Alert.alert('Dynamic Island', 'Đã kích hoạt Dynamic Island thành công! Hãy thoát ra màn hình chính để xem.');
      } else {
        Alert.alert('Dynamic Island', 'Khởi chạy thất bại hoặc môi trường không hỗ trợ.');
      }
    } catch (e) {
      Alert.alert('Lỗi khởi chạy', `Không thể khởi chạy Live Activity: ${e.message}`);
    }
  };

  // Dừng Live Activity (Dynamic Island)
  const stopDynamicIsland = async () => {
    if (!activityId || !LiveActivity) return;

    try {
      const finalState = {
        title: 'Đã dừng đếm',
        subtitle: `Giá trị cuối cùng: ${count}`,
        progressBar: {
          progress: Math.min(Math.max(count / 100, 0), 1),
        },
      };
      await LiveActivity.stopActivity(activityId, finalState);
      setActivityId(null);
      Alert.alert('Dynamic Island', 'Đã tắt Dynamic Island.');
    } catch (e) {
      Alert.alert('Lỗi dừng', `Không thể dừng Live Activity: ${e.message}`);
    }
  };

  // Gửi thông báo Local tức thì chứa số đếm hiện tại
  const sendLocalNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Bộ Đếm Trực Tuyến 🔔",
          body: `Giá trị bộ đếm hiện tại của bạn là: ${count}`,
          sound: true,
          data: { currentCount: count },
        },
        trigger: null, // Gửi ngay lập tức
      });
    } catch (e) {
      Alert.alert('Lỗi gửi thông báo', e.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>EXPO DEMO</Text>
          <Text style={styles.headerSubtitle}>Notifications & Dynamic Island</Text>
        </View>

        {/* Counter Display Card */}
        <View style={styles.counterCard}>
          <Text style={styles.counterLabel}>GIÁ TRỊ HIỆN TẠI</Text>
          <Text style={styles.counterValue}>{count}</Text>
          <View style={styles.badgeContainer}>
            <View style={[styles.badge, { backgroundColor: count % 2 === 0 ? '#8e44ad' : '#d35400' }]}>
              <Text style={styles.badgeText}>{count % 2 === 0 ? 'SỐ CHẴN' : 'SỐ LẺ'}</Text>
            </View>
          </View>
        </View>

        {/* Counter Controls */}
        <View style={styles.controlRow}>
          <TouchableOpacity style={styles.controlButton} onPress={() => updateCount(count - 1)}>
            <Text style={styles.controlButtonText}>-</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.controlButton, styles.resetButton]} 
            onPress={() => updateCount(0)}
          >
            <Text style={styles.resetButtonText}>RESET</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={() => updateCount(count + 1)}>
            <Text style={styles.controlButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TÍNH NĂNG TEST</Text>

          {/* Local Notifications */}
          <TouchableOpacity style={styles.featureCard} onPress={sendLocalNotification}>
            <View style={styles.featureIconContainer}>
              <Text style={styles.featureIcon}>🔔</Text>
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureName}>Gửi Local Notification</Text>
              <Text style={styles.featureDesc}>Bắn thông báo tức thì hiển thị số đếm</Text>
            </View>
          </TouchableOpacity>

          {/* Dynamic Island Status */}
          <View style={styles.statusIndicatorContainer}>
            <View style={[styles.statusDot, { backgroundColor: isLiveActivitySupported ? '#2ecc71' : '#e74c3c' }]} />
            <Text style={styles.statusText}>
              Dynamic Island: {isLiveActivitySupported ? 'Được hỗ trợ (iOS Native)' : 'Không hỗ trợ trên thiết bị này/Expo Go'}
            </Text>
          </View>

          {/* Dynamic Island Controls */}
          {isLiveActivitySupported ? (
            <View style={styles.islandControls}>
              {!activityId ? (
                <TouchableOpacity style={[styles.islandButton, styles.startButton]} onPress={startDynamicIsland}>
                  <Text style={styles.islandButtonText}>🚀 Bắt đầu Dynamic Island</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.islandButton, styles.stopButton]} onPress={stopDynamicIsland}>
                  <Text style={styles.islandButtonText}>🛑 Dừng Dynamic Island</Text>
                </TouchableOpacity>
              )}
              {activityId && (
                <Text style={styles.activeActivityIdText}>
                  Đang chạy ID: {activityId.substring(0, 8)}...
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ Để kiểm tra Dynamic Island thật, hãy cài đặt thư viện và build file IPA bằng cách sử dụng chứng chỉ của bạn, sau đó cài đặt trực tiếp lên iPhone 14 Pro. Chạy trên Expo Go sẽ không kích hoạt được Dynamic Island native.
              </Text>
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F16',
  },
  scrollContainer: {
    padding: 24,
    alignItems: 'stretch',
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF6B6B',
    letterSpacing: 3,
  },
  headerSubtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#A0A0B0',
    marginTop: 4,
  },
  counterCard: {
    backgroundColor: '#161622',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#232335',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 24,
  },
  counterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#707080',
    letterSpacing: 2,
  },
  counterValue: {
    fontSize: 72,
    fontWeight: '800',
    color: '#FFFFFF',
    marginVertical: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 36,
  },
  controlButton: {
    width: 72,
    height: 72,
    backgroundColor: '#161622',
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#232335',
  },
  controlButtonText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  resetButton: {
    flex: 1,
    height: 56,
    marginHorizontal: 16,
    borderRadius: 28,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A0A0B0',
    letterSpacing: 2,
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#707080',
    letterSpacing: 2,
    marginBottom: 16,
  },
  featureCard: {
    backgroundColor: '#161622',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#232335',
    marginBottom: 20,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1D1D30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureIcon: {
    fontSize: 22,
  },
  featureInfo: {
    flex: 1,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  featureDesc: {
    fontSize: 12,
    color: '#707080',
    marginTop: 2,
  },
  statusIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  statusText: {
    fontSize: 12,
    color: '#A0A0B0',
  },
  islandControls: {
    alignItems: 'stretch',
  },
  islandButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  startButton: {
    backgroundColor: '#4D96FF',
  },
  stopButton: {
    backgroundColor: '#FF6B6B',
  },
  islandButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activeActivityIdText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#707080',
    marginTop: 8,
  },
  warningBox: {
    backgroundColor: '#221515',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3D1D1D',
  },
  warningText: {
    fontSize: 12,
    color: '#FF8B8B',
    lineHeight: 18,
  },
});
