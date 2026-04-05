# Hệ Thống Quản Lý Nhân Sự (HRMS) - Phiên Bản MySQL

Đây là một mẫu Hệ Thống Quản Lý Nhân Sự được chuyển đổi từ MongoDB sang **MySQL**. Hệ thống này hoạt động như một kho lưu trữ tập trung cho tất cả các thông tin liên quan đến nhân viên, bao gồm lịch sử giáo dục, kinh nghiệm làm việc gần đây, bản ghi điểm danh, quản lý nghỉ phép và phân bổ dự án hiện tại.

Dự án này được phát triển bằng Node Express với **MySQL Database** và **Sequelize ORM**. Giao diện người dùng được xây dựng với HTML, Bootstrap, CSS và JavaScript.


## Các Tính Năng Chính:
Hệ thống bao gồm các mô-đun sau:
1. Tài Khoản Người Dùng Riêng Lẻ: các tài khoản riêng biệt cho quản trị viên, nhân viên, quản lý dự án và quản lý tài khoản.
1. Kiểm Soát Truy Cập Dựa Trên Vai Trò: Tùy thuộc vào vai trò của họ, người dùng có các chế độ xem khác nhau và mức độ truy cập khác nhau đến dữ liệu.
1. Quản Lý Điểm Danh: Theo dõi và quản lý bản ghi điểm danh.
1. Quản Lý Lương: Xử lý lương của tất cả nhân viên.
1. Hồ Sơ Nhân Viên: Lưu giữ bản ghi về trình độ giáo dục và kinh nghiệm công nghiệp của mỗi nhân viên.
1. Phân Bổ Dự Án: Quản lý phân công dự án, theo dõi những nhân viên nào đang làm việc trên dự án nào.

## Người Dùng:
### 1. Quản Trị Viên:
Quản trị viên có toàn quyền kiểm soát hệ thống, bao gồm các khả năng sau:
- Đăng ký nhân viên mới.
- Quản lý điểm danh.
- Cập nhật / Xóa bản ghi nhân viên
- Phân bổ và hủy phân bổ dự án cho nhân viên.

### 2. Nhân Viên:
Nhân viên có quyền truy cập vào nhiều tính năng, bao gồm:
- Đánh dấu điểm danh và xem lịch sử điểm danh.
- Xem chi tiết lương hiện tại của họ.
- Truy cập hồ sơ nhân viên, bao gồm lịch sử giáo dục và kinh nghiệm làm việc.
- Xem tất cả các dự án mà họ đang tham gia.
- Xin nghỉ phép.

### 3. Quản Lý Dự Án:
Quản lý Dự Án, mặc dù cũng là một nhân viên, có các trách nhiệm bổ sung. Họ có khả năng tiến hành đánh giá hiệu suất cho các thành viên trong nhóm.

### 4. Quản Lý Tài Khoản:
Quản Lý Tài Khoản cũng là một nhân viên có khả năng tạo phiếu lương, đặt tiền thưởng, đặt lương, tăng lương, gửi email cho các nhân viên khác.

## Cách Chạy Dự Án:

### Điều Kiện Tiên Quyết
1. Cài đặt [node.js](https://nodejs.org/en/download/) (phiên bản 18+) trên hệ thống của bạn.
1. Cài đặt [MySQL Community Server](https://dev.mysql.com/downloads/mysql/) trên hệ thống của bạn.
1. Chạy MySQL server (có thể sử dụng [MySQL Workbench](https://www.mysql.com/products/workbench/) hoặc [HeidiSQL](https://www.heidisql.com/) để quản lý GUI).
1. Để tải xuống các phụ thuộc của ứng dụng, hãy mở terminal, đi đến thư mục gốc của ứng dụng/kho lưu trữ và sau đó nhập lệnh **npm install**.

### Thay Đổi Cấu Hình
1. Sửa file `.env` với thông tin kết nối MySQL của bạn:
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password_here
   DB_NAME=HRMS
   DB_NAME_TEST=HRMS_TEST
   ```

### Thiết Lập Dữ Liệu
1. Cách nhanh nhất: import trực tiếp file SQL đầy đủ schema:
   - File: database/hrms_full.sql
   - Import bằng MySQL Workbench hoặc CLI:
   ```
   mysql -u root -p < database/hrms_full.sql
   ```
   Lệnh này sẽ tạo toàn bộ database và tất cả bảng cần cho project.

2. Nếu bạn muốn tạo schema bằng Node thay vì import SQL, có thể chạy:
   ```
   node seed/user-seeder.js
   ```
   Script này hiện chỉ tạo bảng, không tạo tài khoản mặc định.

### Chạy Máy Chủ
1. Để chạy máy chủ ứng dụng, trong terminal, tại thư mục gốc của ứng dụng, hãy nhập lệnh:
   ```
   npm start
   ```
2. Bây giờ để sử dụng hệ thống, hãy mở bất kỳ trình duyệt nào.
3. Trong thanh địa chỉ, hãy viết `localhost:3000`, trong đó 3000 là cổng mà ứng dụng này sử dụng.
4. Trình duyệt sẽ chuyển hướng đến trang chủ của ứng dụng.

### Chạy Bài Kiểm Tra
1. Để chạy bài kiểm tra, trong terminal, tại thư mục gốc của ứng dụng, hãy nhập lệnh:
   ```
   npm test
   ```

## Công nghệ Sử Dụng

| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|----------|---------|
| **Node.js** | 18+ | Runtime JavaScript |
| **Express** | 4.17.1 | Web framework |
| **Sequelize** | Latest | ORM cho MySQL |
| **MySQL** | 5.7+ | Cơ sở dữ liệu |
| **Passport** | 0.4.1 | Xác thực người dùng |
| **bcrypt-nodejs** | 0.0.3 | Mã hóa mật khẩu |
| **EJS** | 3.1.7 | Template engine |
| **Jest** | 29.7.0 | Testing framework |

## Tài Khoản Ban Đầu

Project không còn tạo tài khoản mặc định. Sau khi import SQL, bạn tự tạo tài khoản admin đầu tiên theo quy trình của hệ thống hoặc thêm trực tiếp vào bảng Users.

## Thay Đổi Chính từ MongoDB sang MySQL

- **Database**: MongoDB → MySQL
- **ORM**: Mongoose → Sequelize
- **Session Store**: connect-mongo → connect-session-sequelize
- **Tất cả Model**: Chuyển từ Mongoose schemas sang Sequelize models
- **Query Methods**: Updated to use Sequelize methods (findAll(), findByPk(), create(), update(), destroy())

## Hướng Dẫn Chi Tiết

Xem tệp `MIGRATION_GUIDE.md` để biết chi tiết về cách thức chuyển đổi từ MongoDB sang MySQL và các thay đổi trong mã.

<br/>

**⚠️ Lưu Ý: Repository gốc không còn được duy trì. Phiên bản này đã được chuyển đổi sang MySQL.**