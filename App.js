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
  const [activeTab, setActiveTab] = useState('counter'); // 'counter' | 'timer'
  const [isLiveActivitySupported, setIsLiveActivitySupported] = useState(false);

  // --- STATE BỘ ĐẾM ---
  const [count, setCount] = useState(0);
  const [counterActivityId, setCounterActivityId] = useState(null);

  // --- STATE HẸN GIỜ ---
  const [timerDuration, setTimerDuration] = useState(60); // Tổng thời gian hẹn giờ (giây)
  const [timeLeft, setTimeLeft] = useState(60); // Thời gian còn lại (giây)
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerActivityId, setTimerActivityId] = useState(null);

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
            if (activityID === counterActivityId) {
              setCounterActivityId(null);
            } else if (activityID === timerActivityId) {
              setTimerActivityId(null);
              setIsTimerRunning(false);
            }
          }
        }
      );
      return () => subscription?.remove();
    } catch (e) {
      console.log('Không thể đăng ký lắng nghe cập nhật Live Activity:', e);
    }
  }, [isLiveActivitySupported, counterActivityId, timerActivityId]);

  // --- LOGIC BỘ ĐẾM ---
  const updateCount = async (newCount) => {
    setCount(newCount);

    if (counterActivityId && isLiveActivitySupported && LiveActivity) {
      try {
        const state = {
          title: `Số đếm: ${newCount}`,
          subtitle: newCount % 2 === 0 ? 'Số chẵn • Tiến trình 🟣' : 'Số lẻ • Tiến trình 🟡',
          progressBar: {
            progress: Math.min(Math.max(newCount / 100, 0), 1),
          },
          imageName: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100',
        };
        await LiveActivity.updateActivity(counterActivityId, state);
      } catch (e) {
        console.log('Lỗi cập nhật Dynamic Island Bộ đếm:', e);
      }
    }
  };

  const startCounterActivity = async () => {
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
        setCounterActivityId(id);
        Alert.alert('Dynamic Island', 'Đã kích hoạt Dynamic Island cho Bộ đếm! Hãy thoát ra màn hình chính để xem.');
      }
    } catch (e) {
      Alert.alert('Lỗi khởi chạy', `Không thể khởi chạy Live Activity: ${e.message}`);
    }
  };

  const stopCounterActivity = async () => {
    if (!counterActivityId || !LiveActivity) return;

    try {
      const finalState = {
        title: 'Đã dừng đếm',
        subtitle: `Giá trị cuối cùng: ${count}`,
        progressBar: {
          progress: Math.min(Math.max(count / 100, 0), 1),
        },
      };
      await LiveActivity.stopActivity(counterActivityId, finalState);
      setCounterActivityId(null);
      Alert.alert('Dynamic Island', 'Đã tắt Dynamic Island Bộ đếm.');
    } catch (e) {
      Alert.alert('Lỗi dừng', `Không thể dừng Live Activity: ${e.message}`);
    }
  };

  const sendLocalNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Bộ Đếm Trực Tuyến 🔔",
          body: `Giá trị bộ đếm hiện tại của bạn là: ${count}`,
          sound: true,
          data: { currentCount: count },
        },
        trigger: null,
      });
    } catch (e) {
      Alert.alert('Lỗi gửi thông báo', e.message);
    }
  };

  // --- LOGIC HẸN GIỜ (TIMER) ---
  // Chạy đếm ngược thời gian thực trên UI
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsTimerRunning(false);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  // Khi hoàn thành thời gian hẹn giờ
  const handleTimerComplete = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Hết giờ rồi! ⏰",
          body: "Đã hoàn thành thời gian đếm ngược.",
          sound: true,
        },
        trigger: null,
      });
    } catch (e) {
      console.log('Lỗi gửi thông báo hết giờ:', e);
    }

    if (timerActivityId && isLiveActivitySupported && LiveActivity) {
      try {
        const finalState = {
          title: "Hoàn thành! 🎉",
          subtitle: "Đã hết thời gian hẹn giờ",
          progressBar: {
            progress: 1,
          },
        };
        await LiveActivity.stopActivity(timerActivityId, finalState);
        setTimerActivityId(null);
      } catch (e) {
        console.log('Lỗi dừng Live Activity khi hết giờ:', e);
      }
    }
  };

  // Bắt đầu Hẹn giờ
  const startTimer = async () => {
    if (isTimerRunning) return;

    setIsTimerRunning(true);
    setTimeLeft(timerDuration);

    if (isLiveActivitySupported && LiveActivity) {
      try {
        const endTime = Date.now() + timerDuration * 1000;
        const state = {
          title: "Đang hẹn giờ ⏳",
          subtitle: "Đang đếm ngược...",
          progressBar: {
            date: endTime, // Gửi mốc thời gian kết thúc, iOS sẽ tự động vẽ đếm ngược trên Dynamic Island
          },
          imageName: 'https://images.unsplash.com/photo-1508962914676-134849a727f0?w=100',
          dynamicIslandImageName: 'https://images.unsplash.com/photo-1508962914676-134849a727f0?w=50',
        };

        const config = {
          backgroundColor: '0F0F16',
          titleColor: '#FFD200',
          subtitleColor: '#FFFFFF90',
          progressViewTint: '#FFD200',
          progressViewLabelColor: '#FFFFFF',
          timerType: 'digital',
        };

        const id = await LiveActivity.startActivity(state, config, 1.0);
        if (id) {
          setTimerActivityId(id);
        }
      } catch (e) {
        console.log('Lỗi khởi chạy Dynamic Island cho Hẹn giờ:', e);
      }
    }
  };

  // Dừng/Hủy Hẹn giờ
  const stopTimer = async () => {
    setIsTimerRunning(false);
    setTimeLeft(timerDuration);

    if (timerActivityId && isLiveActivitySupported && LiveActivity) {
      try {
        const finalState = {
          title: "Đã hủy đếm ngược 🛑",
          subtitle: "Hẹn giờ đã bị dừng.",
          progressBar: {
            progress: 0,
          },
        };
        await LiveActivity.stopActivity(timerActivityId, finalState);
        setTimerActivityId(null);
      } catch (e) {
        console.log('Lỗi dừng Live Activity Hẹn giờ:', e);
      }
    }
  };

  const changeTimerDuration = (amount) => {
    if (isTimerRunning) return;
    const newDuration = Math.max(10, timerDuration + amount); // Tối thiểu 10 giây
    setTimerDuration(newDuration);
    setTimeLeft(newDuration);
  };

  const selectQuickDuration = (seconds) => {
    if (isTimerRunning) return;
    setTimerDuration(seconds);
    setTimeLeft(seconds);
  };

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>EXPO LIVE DEMO</Text>
        <Text style={styles.headerSubtitle}>Notifications & Dynamic Island</Text>
      </View>

      {/* Navigation Tabs (Kính mờ sang trọng) */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navTab, activeTab === 'counter' && styles.activeNavTab]}
          onPress={() => setActiveTab('counter')}
        >
          <Text style={[styles.navTabText, activeTab === 'counter' && styles.activeNavTabText]}>
            🔢 BỘ ĐẾM
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navTab, activeTab === 'timer' && styles.activeNavTab]}
          onPress={() => setActiveTab('timer')}
        >
          <Text style={[styles.navTabText, activeTab === 'timer' && styles.activeNavTabText]}>
            ⏳ HẸN GIỜ
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* --- MÀN HÌNH BỘ ĐẾM --- */}
        {activeTab === 'counter' && (
          <View>
            {/* Display Card */}
            <View style={styles.counterCard}>
              <Text style={styles.counterLabel}>GIÁ TRỊ HIỆN TẠI</Text>
              <Text style={styles.counterValue}>{count}</Text>
              <View style={styles.badgeContainer}>
                <View style={[styles.badge, { backgroundColor: count % 2 === 0 ? '#8e44ad' : '#d35400' }]}>
                  <Text style={styles.badgeText}>{count % 2 === 0 ? 'SỐ CHẴN' : 'SỐ LẺ'}</Text>
                </View>
              </View>
            </View>

            {/* Controls */}
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

            {/* Features */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>TÍNH NĂNG TEST</Text>

              {/* Notification Button */}
              <TouchableOpacity style={styles.featureCard} onPress={sendLocalNotification}>
                <View style={styles.featureIconContainer}>
                  <Text style={styles.featureIcon}>🔔</Text>
                </View>
                <View style={styles.featureInfo}>
                  <Text style={styles.featureName}>Gửi Local Notification</Text>
                  <Text style={styles.featureDesc}>Bắn thông báo tức thì hiển thị số đếm</Text>
                </View>
              </TouchableOpacity>

              {/* Dynamic Island Controls */}
              {isLiveActivitySupported ? (
                <View style={styles.islandControls}>
                  {!counterActivityId ? (
                    <TouchableOpacity style={[styles.islandButton, styles.startButton]} onPress={startCounterActivity}>
                      <Text style={styles.islandButtonText}>🚀 Bắt đầu Dynamic Island</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={[styles.islandButton, styles.stopButton]} onPress={stopCounterActivity}>
                      <Text style={styles.islandButtonText}>🛑 Dừng Dynamic Island</Text>
                    </TouchableOpacity>
                  )}
                  {counterActivityId && (
                    <Text style={styles.activeActivityIdText}>
                      Đang chạy ID: {counterActivityId.substring(0, 8)}...
                    </Text>
                  )}
                </View>
              ) : (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    ⚠️ Chạy trên Expo Go sẽ không kích hoạt được Dynamic Island thật. Vui lòng build file IPA để kiểm nghiệm trên iPhone 14 Pro.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* --- MÀN HÌNH HẸN GIỜ --- */}
        {activeTab === 'timer' && (
          <View>
            {/* Timer Display Card */}
            <View style={[styles.counterCard, { borderColor: '#ffd20030' }]}>
              <Text style={[styles.counterLabel, { color: '#FFD200' }]}>THỜI GIAN CÒN LẠI</Text>
              <Text style={[styles.counterValue, { color: '#FFD200', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
                {formatTime(timeLeft)}
              </Text>
              <Text style={styles.timerDurationHint}>
                Cấu hình: {formatTime(timerDuration)}
              </Text>
            </View>

            {/* Quick Presets & Adjustment */}
            {!isTimerRunning && (
              <View style={styles.presetSection}>
                <View style={styles.quickDurationRow}>
                  <TouchableOpacity style={styles.presetButton} onPress={() => selectQuickDuration(30)}>
                    <Text style={styles.presetButtonText}>30s</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetButton} onPress={() => selectQuickDuration(60)}>
                    <Text style={styles.presetButtonText}>1m</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetButton} onPress={() => selectQuickDuration(300)}>
                    <Text style={styles.presetButtonText}>5m</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetButton} onPress={() => selectQuickDuration(1500)}>
                    <Text style={styles.presetButtonText}>25m</Text>
                  </TouchableOpacity>
                </View>

                {/* Fine Adjustment Row */}
                <View style={styles.adjustRow}>
                  <TouchableOpacity style={styles.adjustButton} onPress={() => changeTimerDuration(-10)}>
                    <Text style={styles.adjustButtonText}>-10s</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.adjustButton} onPress={() => changeTimerDuration(10)}>
                    <Text style={styles.adjustButtonText}>+10s</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Timer Controls */}
            <View style={styles.timerControlsRow}>
              {!isTimerRunning ? (
                <TouchableOpacity style={[styles.timerMainButton, { backgroundColor: '#2ecc71' }]} onPress={startTimer}>
                  <Text style={styles.timerMainButtonText}>▶ BẮT ĐẦU</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.timerMainButton, { backgroundColor: '#e74c3c' }]} onPress={stopTimer}>
                  <Text style={styles.timerMainButtonText}>🛑 HỦY HẸN GIỜ</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Status & Help */}
            <View style={styles.section}>
              {isLiveActivitySupported ? (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    💡 Khi bấm **Bắt đầu Hẹn giờ**, hệ thống sẽ tự động cập nhật đếm ngược thực tế (native countdown) trực quan trên Dynamic Island & màn hình khóa. Bạn có thể khóa màn hình hoặc thoát ứng dụng để thấy bộ đếm ngược hoạt động mượt mà.
                  </Text>
                </View>
              ) : (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    ⚠️ Chạy trên Expo Go sẽ không kích hoạt được Dynamic Island thật. Hẹn giờ sẽ chỉ đếm ngược trên giao diện app và thông báo khi hoàn thành.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Global Live Activity Support Status Footer */}
        <View style={styles.footer}>
          <View style={[styles.statusDot, { backgroundColor: isLiveActivitySupported ? '#2ecc71' : '#e74c3c' }]} />
          <Text style={styles.footerText}>
            Dynamic Island: {isLiveActivitySupported ? 'Sẵn sàng (iOS Native)' : 'Chưa được bật / Không hỗ trợ'}
          </Text>
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
    marginTop: 10,
    marginBottom: 16,
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
  // Tab Navigation Bar
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#16162280',
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#232335',
  },
  navTab: {
    flex: 1,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  activeNavTab: {
    backgroundColor: '#232335',
  },
  navTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#707080',
    letterSpacing: 1,
  },
  activeNavTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    marginVertical: 24,
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
  timerDurationHint: {
    fontSize: 12,
    color: '#707080',
    marginTop: 4,
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
    marginBottom: 24,
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
  // Hẹn giờ UI Styles
  presetSection: {
    marginBottom: 24,
  },
  quickDurationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  presetButton: {
    flex: 1,
    backgroundColor: '#161622',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#232335',
  },
  presetButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  adjustRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  adjustButton: {
    flex: 1,
    backgroundColor: '#161622',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#232335',
  },
  adjustButtonText: {
    color: '#FFD200',
    fontWeight: '700',
    fontSize: 14,
  },
  timerControlsRow: {
    alignItems: 'stretch',
    marginBottom: 24,
  },
  timerMainButton: {
    height: 58,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  timerMainButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  infoBox: {
    backgroundColor: '#15221b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1d3d28',
  },
  infoText: {
    fontSize: 12,
    color: '#8bff8b',
    lineHeight: 18,
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 32,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  footerText: {
    fontSize: 11,
    color: '#505060',
  },
});
