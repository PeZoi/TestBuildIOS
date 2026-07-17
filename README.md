# Hướng Dẫn Build iOS Unsigned & Khắc Phục Lỗi Trắng Màn Hình (Expo SDK 54)

Tài liệu này tổng hợp toàn bộ nguyên nhân gây lỗi trắng màn hình (White Screen of Death) khi build ứng dụng Expo/React Native thành file `.ipa` chưa ký (Unsigned) trên môi trường **GitHub Actions (Windows workflow)** và các câu lệnh khắc phục nhanh ở máy local.

---

## 📌 Các Nguyên Nhân Gây Lỗi Trắng Màn Hình & Cách Khắc Phục

### 1. Xung Đột Phiên Bản React Native (Hermes Engine Crash)
* **Triệu chứng:** Xcode build native bị lỗi hoặc ứng dụng cài vào máy bị crash trắng màn hình ngay khi khởi động.
* **Nguyên nhân:** Khai báo phiên bản React / React Native quá mới (ví dụ: `react-native: 0.81.5`, `react: 19.1.0`) không tương thích với bộ chạy JavaScript (**Hermes Engine**) của Expo SDK 54. Gây ra lỗi biên dịch cú pháp JavaScript hiện đại (như thuộc tính private dùng dấu `#` như `#length`, `#width` không được Hermes hỗ trợ).
* **Cách khắc phục (ở local):**
  Chạy lệnh sau tại thư mục dự án để Expo tự động hạ cấp/cấu hình lại các gói thư viện về phiên bản tương thích chính thức của SDK 54:
  ```bash
  npx expo install --fix
  ```

### 2. Xcode Bỏ Qua Đóng Gói JS Bundle (Thiếu main.jsbundle)
* **Triệu chứng:** File `.ipa` build thành công nhưng khi cài vào máy chỉ hiện màn hình trắng xóa do không có mã nguồn JavaScript để thực thi.
* **Nguyên nhân:** Khi chạy lệnh `xcodebuild` tắt tính năng ký bảo mật (`CODE_SIGNING_ALLOWED=NO`), Xcode trên máy ảo CI tự động bỏ qua (skip) bước chạy script tự động đóng gói `main.jsbundle` của React Native.
* **Cách khắc phục:**
  Sử dụng cơ chế **"Bảo hiểm kép" (Force Inject)** trong file cấu hình `.github/workflows/build-unsigned-ios.yml`:
  1. Chủ động chạy lệnh đóng gói trước bằng CLI:
     ```bash
     npx react-native bundle --entry-file index.ts --platform ios --dev false --bundle-output ios/main.jsbundle --assets-dest ios/bundle-assets
     ```
  2. Tự động kiểm tra và copy cưỡng bức file `main.jsbundle` vào thư mục `.app` trước khi nén thành `.ipa`:
     ```bash
     if [ ! -f "$APP_PATH/main.jsbundle" ]; then
       cp ios/main.jsbundle "$APP_PATH/"
     fi
     ```

### 3. Thiếu File Cấu Hình Khi Chuyển Sang TypeScript
* **Triệu chứng:** Metro Bundler hoặc Babel báo lỗi thiếu preset, không dịch được file `.tsx`, `.ts`.
* **Nguyên nhân:** Khi chuyển đổi từ dự án JavaScript sang TypeScript, dự án thiếu các file cấu hình biên dịch hoặc thiếu các gói thư viện CLI phụ thuộc ở `devDependencies`.
* **Cách khắc phục:**
  * Đảm bảo bổ sung đầy đủ các file cấu hình ở gốc dự án:
    * `tsconfig.json` (Định nghĩa TypeScript)
    * `expo-env.d.ts` (Khai báo kiểu dữ liệu Expo)
    * `babel.config.js` (Chứa `babel-preset-expo`)
    * `metro.config.js` (Định tuyến Metro của Expo)
  * Đảm bảo cài đặt các gói hỗ trợ đóng gói trong `package.json`:
    ```json
    "devDependencies": {
      "typescript": "~5.9.2",
      "@react-native-community/cli": "latest",
      "@react-native/metro-config": "latest",
      "babel-preset-expo": "latest"
    }
    ```

### 4. Lỗi Khởi Tạo Safe Area Context (Runtime Context Crash)
* **Triệu chứng:** App mở trên điện thoại bị trắng màn hình (hoặc crash) do lỗi React Context.
* **Nguyên nhân:** Sử dụng `SafeAreaView` từ thư viện `react-native-safe-area-context` ngay bên trong component gốc `App` cùng lúc với `SafeAreaProvider`. Lúc này context chưa mount kịp nên các thông số insets bị `null/undefined`.
* **Cách khắc phục:**
  * Loại bỏ thư viện `react-native-safe-area-context`.
  * Thay thế bằng thẻ `View` tiêu chuẩn của React Native và tự cấu hình padding tai thỏ dựa trên hệ điều hành:
    ```javascript
    paddingTop: Platform.OS === 'ios' ? 54 : 20 // 54px cho các dòng iPhone tai thỏ/dynamic island
    ```

---

## 💻 Cheat Sheet: Các Câu Lệnh Hữu Ích Ở Local

### 1. Lệnh Kiểm Tra Lỗi Nhanh Trước Khi Push (Tiết kiệm thời gian)
Thay vì chờ 5 phút trên GitHub Actions, hãy chạy các lệnh này ở terminal local:

* **Quét lỗi cú pháp TypeScript:**
  ```bash
  npx tsc --noEmit
  ```
  *(Nếu terminal không báo lỗi gì tức là code sạch).*

* **Chạy thử đóng gói Metro Bundler xem có lỗi import/thư viện không:**
  ```bash
  npx react-native bundle --entry-file index.ts --platform ios --dev false --bundle-output test.jsbundle
  ```
  *(Sau khi chạy xong, bạn có thể xóa file `test.jsbundle` đi).*

### 2. Lệnh Chạy Git Push Nhanh
```bash
git add .
git commit -m "Nội dung commit của bạn"
git push
```

### 3. Lệnh Chạy Dev Server
```bash
npx expo start --tunnel
```
