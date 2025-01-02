
# MultiTools - Công Cụ Chỉnh Sửa và Thiết Kế Đa Phương Tiện

### **Các Chức Năng Chính**

- Chỉnh sửa hình ảnh.
- Chỉnh sửa video.
- Chỉnh sửa âm thanh.
- Chuyển đổi định dạng tệp.
- AI Generator (sắp ra mắt...).

---

## **Hướng Dẫn Thiết Lập Dự Án**

### **Yêu Cầu Hệ Thống**

- Cài đặt sẵn **Node.js**, **Python**, và **FFmpeg** (công cụ xử lý âm thanh và video).
- Cài đặt **MongoDB** với cổng mặc định và tạo một cơ sở dữ liệu trống tên là `mydatabase`. (Nếu chưa cài đặt, tham khảo video hướng dẫn: [Tại đây](https://www.youtube.com/watch?v=RmPp69cwNgg)).
- Sử dụng **Visual Studio Code (VS Code)** để làm việc với dự án.

---

### **Các Bước Thiết Lập**

1. **Clone dự án về máy:**
   ```bash
   git clone https://github.com/thanhbinhs/MultiTools.git
   ```
2. **Mở dự án bằng VS Code.**
3. **Cài đặt thư viện UI và các phụ thuộc:**
   - Mở terminal, điều hướng vào thư mục frontend:
     ```bash
     cd frontend
     ```
   - Cài đặt node modules:
     ```bash
     npm install
     ```
4. **Kiểm tra lỗ hổng bảo mật:**
   - Nếu không có lỗi, bỏ qua bước này.
   - Nếu có cảnh báo về lỗ hổng bảo mật, sửa lỗi bằng một trong các lệnh sau:
     ```bash
     npm audit fix
     npm audit fix --force # (để sửa tất cả)
     ```
5. **Cài đặt môi trường backend:**
   - Quay lại thư mục backend:
     ```bash
     cd ../backend
     ```
   - Tạo môi trường ảo Python:
     ```bash
     python -m venv venv
     ```
   - Kích hoạt môi trường ảo:
     - **Windows:**
       ```bash
       venv\Scripts\activate
       ```
     - **macOS/Linux:**
       ```bash
       source venv/bin/activate
       ```
     - Khi kích hoạt thành công, bạn sẽ thấy tên môi trường hiển thị trong terminal (ví dụ: `(venv)`).
   - Cài đặt các thư viện cần thiết từ file `requirements.txt`:
     ```bash
     pip install -r requirements.txt
     ```
6. **Kết nối MongoDB:**
   - Sử dụng extension **MongoDB for VS Code** để khởi động kết nối tới cơ sở dữ liệu.
7. **Khởi động dự án:**
   - Điều hướng từ thư mục backend về lại frontend:
     ```bash
     cd ../frontend
     ```
   - Chạy dự án:
     ```bash
     npm run all
     ```
   - Truy cập ứng dụng tại: [http://localhost:3000](http://localhost:3000).

---

### **Liên Hệ Hỗ Trợ**

- Nếu gặp bất kỳ vấn đề nào, vui lòng liên hệ nhóm phát triển qua email hoặc trên repository.
