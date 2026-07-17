import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Animated,
  Platform,
  Dimensions,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Interface cho Laps trong Stopwatch
interface Lap {
  id: string;
  lapTime: number;
  overallTime: number;
}

type AppMode = 'stopwatch' | 'timer';

export default function App() {
  const [mode, setMode] = useState<AppMode>('stopwatch');

  // --- STOPWATCH STATES ---
  const [swTime, setSwTime] = useState<number>(0); // mili-giây
  const [swRunning, setSwRunning] = useState<boolean>(false);
  const [laps, setLaps] = useState<Lap[]>([]);
  const swInterval = useRef<NodeJS.Timeout | null>(null);

  // --- TIMER STATES ---
  const [timerDuration, setTimerDuration] = useState<number>(60); // giây (mặc định 1 phút)
  const [timerLeft, setTimerLeft] = useState<number>(60); // giây còn lại
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  // --- DYNAMIC ISLAND ANIMATION ---
  const [islandExpanded, setIslandExpanded] = useState<boolean>(false);
  const islandWidth = useRef(new Animated.Value(120)).current; // Chiều rộng mặc định
  const islandHeight = useRef(new Animated.Value(34)).current; // Chiều cao mặc định
  const islandRadius = useRef(new Animated.Value(17)).current; // Bo góc mặc định

  // --- NOTIFICATION ANIMATION ---
  const [notificationText, setNotificationText] = useState<string>('');
  const notificationY = useRef(new Animated.Value(-180)).current; // Bắt đầu ở ngoài màn hình phía trên

  // --- STOPWATCH LOGIC ---
  const startStopwatch = () => {
    if (swRunning) {
      if (swInterval.current) clearInterval(swInterval.current);
      setSwRunning(false);
      triggerIslandAnimation(false);
    } else {
      setSwRunning(true);
      const startTime = Date.now() - swTime;
      swInterval.current = setInterval(() => {
        setSwTime(Date.now() - startTime);
      }, 10);
      triggerIslandAnimation(true);
    }
  };

  const resetStopwatch = () => {
    if (swInterval.current) clearInterval(swInterval.current);
    setSwTime(0);
    setSwRunning(false);
    setLaps([]);
    triggerIslandAnimation(false);
  };

  const recordLap = () => {
    const newLap: Lap = {
      id: Date.now().toString(),
      lapTime: laps.length === 0 ? swTime : swTime - laps[0].overallTime,
      overallTime: swTime,
    };
    setLaps([newLap, ...laps]);
  };

  // --- TIMER LOGIC ---
  const startTimer = () => {
    if (timerRunning) {
      if (timerInterval.current) clearInterval(timerInterval.current);
      setTimerRunning(false);
      triggerIslandAnimation(false);
    } else {
      if (timerLeft <= 0) {
        setTimerLeft(timerDuration);
      }
      setTimerRunning(true);
      triggerIslandAnimation(true);
    }
  };

  useEffect(() => {
    if (timerRunning) {
      timerInterval.current = setInterval(() => {
        setTimerLeft((prev) => {
          if (prev <= 1) {
            if (timerInterval.current) clearInterval(timerInterval.current);
            setTimerRunning(false);
            triggerNotification('Hết giờ rồi! 🕒\nĐồng hồ đếm ngược đã kết thúc.');
            triggerIslandAnimation(false);
            Vibration.vibrate([0, 500, 200, 500]); // Rung kiểu báo thức
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerInterval.current) clearInterval(timerInterval.current);
    }

    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [timerRunning]);

  const resetTimer = () => {
    if (timerInterval.current) clearInterval(timerInterval.current);
    setTimerRunning(false);
    setTimerLeft(timerDuration);
    triggerIslandAnimation(false);
  };

  const adjustTimer = (amount: number) => {
    if (timerRunning) return;
    setTimerDuration((prev) => {
      const newVal = Math.max(10, prev + amount); // Tối thiểu 10 giây
      setTimerLeft(newVal);
      return newVal;
    });
  };

  // --- ANIMATIONS IMPLEMENTATION ---
  const triggerIslandAnimation = (running: boolean) => {
    const targetWidth = running ? 150 : 120;
    const targetHeight = 34;
    const targetRadius = 17;

    Animated.spring(islandWidth, {
      toValue: targetWidth,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();

    Animated.spring(islandHeight, {
      toValue: targetHeight,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();

    Animated.spring(islandRadius, {
      toValue: targetRadius,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();

    setIslandExpanded(false);
  };

  const toggleExpandIsland = () => {
    if (!swRunning && !timerRunning) return;

    const expand = !islandExpanded;
    setIslandExpanded(expand);

    Animated.spring(islandWidth, {
      toValue: expand ? width - 40 : (swRunning || timerRunning ? 150 : 120),
      useNativeDriver: false,
      friction: 7,
      tension: 35,
    }).start();

    Animated.spring(islandHeight, {
      toValue: expand ? 80 : 34,
      useNativeDriver: false,
      friction: 7,
      tension: 35,
    }).start();

    Animated.spring(islandRadius, {
      toValue: expand ? 30 : 17,
      useNativeDriver: false,
      friction: 7,
      tension: 35,
    }).start();
  };

  const triggerNotification = (text: string) => {
    setNotificationText(text);
    Animated.spring(notificationY, {
      toValue: Platform.OS === 'ios' ? 54 : 36, // Đẩy xuống dưới Dynamic Island thực tế
      useNativeDriver: true,
      friction: 6,
      tension: 40,
    }).start();

    setTimeout(() => {
      Animated.timing(notificationY, {
        toValue: -180,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (swInterval.current) clearInterval(swInterval.current);
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, []);

  const formatStopwatch = (time: number) => {
    const min = Math.floor(time / 60000);
    const sec = Math.floor((time % 60000) / 1000);
    const ms = Math.floor((time % 1000) / 10);
    return `${min.toString().padStart(2, '0')}:${sec
      .toString()
      .padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const formatTimer = (secs: number) => {
    const min = Math.floor(secs / 60);
    const sec = secs % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* --- DYNAMIC ISLAND GIẢ LẬP --- */}
      <View style={styles.islandContainer}>
        <TouchableOpacity activeOpacity={0.9} onPress={toggleExpandIsland}>
          <Animated.View
            style={[
              styles.dynamicIsland,
              {
                width: islandWidth,
                height: islandHeight,
                borderRadius: islandRadius,
              },
            ]}
          >
            {!islandExpanded ? (
              <View style={styles.islandCollapsedContent}>
                {swRunning && (
                  <>
                    <Ionicons name="stopwatch" size={14} color="#30D158" style={styles.islandIcon} />
                    <Text style={styles.islandText}>{formatStopwatch(swTime).substring(0, 5)}</Text>
                  </>
                )}
                {timerRunning && (
                  <>
                    <Ionicons name="timer" size={14} color="#FF9F0A" style={styles.islandIcon} />
                    <Text style={styles.islandText}>{formatTimer(timerLeft)}</Text>
                  </>
                )}
                {!swRunning && !timerRunning && (
                  <View style={styles.islandCameraPlaceholder} />
                )}
              </View>
            ) : (
              <View style={styles.islandExpandedContent}>
                {swRunning && (
                  <View style={styles.expandedRow}>
                    <View style={styles.expandedTextGroup}>
                      <Text style={styles.expandedTitle}>Bấm giờ đang chạy</Text>
                      <Text style={styles.expandedTime}>{formatStopwatch(swTime)}</Text>
                    </View>
                    <View style={styles.expandedControls}>
                      <TouchableOpacity style={[styles.islandBtn, styles.islandBtnPause]} onPress={startStopwatch}>
                        <Ionicons name="pause" size={16} color="#FFF" />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.islandBtn, styles.islandBtnReset]} onPress={resetStopwatch}>
                        <Ionicons name="square" size={14} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                {timerRunning && (
                  <View style={styles.expandedRow}>
                    <View style={styles.expandedTextGroup}>
                      <Text style={styles.expandedTitle}>Đang đếm ngược</Text>
                      <Text style={[styles.expandedTime, { color: '#FF9F0A' }]}>{formatTimer(timerLeft)}</Text>
                    </View>
                    <View style={styles.expandedControls}>
                      <TouchableOpacity style={[styles.islandBtn, styles.islandBtnPause, { backgroundColor: '#FF9F0A' }]} onPress={startTimer}>
                        <Ionicons name="pause" size={16} color="#FFF" />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.islandBtn, styles.islandBtnReset]} onPress={resetTimer}>
                        <Ionicons name="refresh" size={16} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* --- THÔNG BÁO IOS GIẢ LẬP --- */}
      <Animated.View
        style={[
          styles.notificationBanner,
          {
            transform: [{ translateY: notificationY }],
          },
        ]}
      >
        <View style={styles.notificationHeader}>
          <View style={styles.notificationIconBg}>
            <Ionicons name="alarm" size={16} color="#FFF" />
          </View>
          <Text style={styles.notificationAppName}>ĐỒNG HỒ</Text>
          <Text style={styles.notificationTime}>bây giờ</Text>
        </View>
        <Text style={styles.notificationText}>{notificationText}</Text>
      </Animated.View>

      {/* --- MAIN DISPLAY --- */}
      <View style={styles.mainContent}>
        {/* Header Chuyển đổi Mode */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, mode === 'stopwatch' && styles.tabButtonActive]}
            onPress={() => setMode('stopwatch')}
          >
            <Ionicons name="stopwatch-outline" size={18} color={mode === 'stopwatch' ? '#FFF' : '#8E8E93'} />
            <Text style={[styles.tabText, mode === 'stopwatch' && styles.tabTextActive]}>Bấm giờ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, mode === 'timer' && styles.tabButtonActive]}
            onPress={() => setMode('timer')}
          >
            <Ionicons name="timer-outline" size={18} color={mode === 'timer' ? '#FFF' : '#8E8E93'} />
            <Text style={[styles.tabText, mode === 'timer' && styles.tabTextActive]}>Hẹn giờ</Text>
          </TouchableOpacity>
        </View>

        {/* HIỂN THỊ CHẾ ĐỘ BẤM GIỜ (STOPWATCH) */}
        {mode === 'stopwatch' && (
          <View style={styles.modeWrapper}>
            <View style={styles.timerDisplayContainer}>
              <Text style={styles.timerDisplayText}>{formatStopwatch(swTime)}</Text>
            </View>

            {/* Các nút bấm điều khiển */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.roundButton, { backgroundColor: '#1C1C1E' }]}
                onPress={swRunning ? recordLap : resetStopwatch}
              >
                <Text style={[styles.buttonText, { color: '#FFF' }]}>
                  {swRunning ? 'Vòng' : 'Đặt lại'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roundButton,
                  { backgroundColor: swRunning ? '#2C0D0E' : '#0A2A12' },
                ]}
                onPress={startStopwatch}
              >
                <Text style={[styles.buttonText, { color: swRunning ? '#FF453A' : '#30D158' }]}>
                  {swRunning ? 'Dừng' : 'Bắt đầu'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Danh sách Laps */}
            <FlatList<Lap>
              data={laps}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.lapsList}
              renderItem={({ item, index }) => (
                <View style={styles.lapRow}>
                  <Text style={styles.lapLabel}>Vòng {laps.length - index}</Text>
                  <Text style={styles.lapTimeValue}>{formatStopwatch(item.lapTime)}</Text>
                </View>
              )}
            />
          </View>
        )}

        {/* HIỂN THỊ CHẾ ĐỘ HẸN GIỜ (TIMER) */}
        {mode === 'timer' && (
          <View style={styles.modeWrapper}>
            <View style={styles.timerDisplayContainer}>
              {timerRunning ? (
                <Text style={[styles.timerDisplayText, { color: '#FF9F0A' }]}>
                  {formatTimer(timerLeft)}
                </Text>
              ) : (
                <View style={styles.selectorWrapper}>
                  <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustTimer(-10)}>
                    <Ionicons name="remove-circle-outline" size={32} color="#FFF" />
                  </TouchableOpacity>
                  <View style={styles.selectorDisplay}>
                    <Text style={styles.selectorTime}>{formatTimer(timerDuration)}</Text>
                    <Text style={styles.selectorLabel}>Nhấp để chỉnh thời gian</Text>
                  </View>
                  <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustTimer(10)}>
                    <Ionicons name="add-circle-outline" size={32} color="#FFF" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Các nút bấm điều khiển */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.roundButton, { backgroundColor: '#1C1C1E' }]}
                onPress={resetTimer}
              >
                <Text style={[styles.buttonText, { color: '#FFF' }]}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roundButton,
                  { backgroundColor: timerRunning ? '#2C1A0A' : '#0A2A12' },
                ]}
                onPress={startTimer}
              >
                <Text style={[styles.buttonText, { color: timerRunning ? '#FF9F0A' : '#30D158' }]}>
                  {timerRunning ? 'Tạm dừng' : 'Bắt đầu'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Nút Test giả lập thông báo trực tiếp */}
            <TouchableOpacity
              style={styles.toastTestBtn}
              onPress={() => triggerNotification('🔔 Demo: Cuộc gọi đến giả lập từ Apple Inc.')}
            >
              <Ionicons name="notifications-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.toastTestText}>Test Thông Báo iOS</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Đen sẫm chuẩn iOS
    paddingTop: Platform.OS === 'ios' ? 54 : 20, // Tự xử lý chiều cao tai thỏ
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    padding: 2,
    marginVertical: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: '#2C2C2E',
  },
  tabText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '600',
    marginLeft: 6,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  modeWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  timerDisplayContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginVertical: 20,
  },
  timerDisplayText: {
    fontSize: 72,
    fontWeight: '200',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  selectorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '80%',
  },
  selectorDisplay: {
    alignItems: 'center',
  },
  selectorTime: {
    fontSize: 48,
    fontWeight: '300',
    color: '#FFFFFF',
  },
  selectorLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  adjustBtn: {
    padding: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  roundButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  lapsList: {
    width: width - 32,
    paddingTop: 10,
  },
  lapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
    width: '100%',
  },
  lapLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  lapTimeValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  islandContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 12 : 36,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  dynamicIsland: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#1C1C1E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  islandCollapsedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    paddingHorizontal: 12,
  },
  islandCameraPlaceholder: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1C1C1E',
  },
  islandIcon: {
    marginRight: 6,
  },
  islandText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  islandExpandedContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  expandedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  expandedTextGroup: {
    flex: 1,
  },
  expandedTitle: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  expandedTime: {
    color: '#30D158',
    fontSize: 22,
    fontWeight: '300',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  expandedControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  islandBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  islandBtnPause: {
    backgroundColor: '#30D158',
  },
  islandBtnReset: {
    backgroundColor: '#FF453A',
  },
  notificationBanner: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(28, 28, 30, 0.9)',
    borderRadius: 20,
    padding: 16,
    zIndex: 998,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  notificationIconBg: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#FF9F0A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  notificationAppName: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  notificationTime: {
    color: '#8E8E93',
    fontSize: 11,
    marginLeft: 'auto',
  },
  notificationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  toastTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  toastTestText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
