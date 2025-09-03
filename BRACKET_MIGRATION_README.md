# Bracket Migration Guide

## Tổng quan

Hướng dẫn migration từ cấu trúc cũ sang cấu trúc mới hỗ trợ nhiều brackets trong một tournament.

### Cấu trúc cũ:
```
Tournament (1) → Round (N) → Match (N)
```

### Cấu trúc mới:
```
Tournament (1) → Bracket (N) → Round (N) → Match (N)
```

## Lợi ích của cấu trúc mới

1. **Hỗ trợ nhiều brackets**: Một tournament có thể có nhiều brackets (Main Bracket, Consolation Bracket, etc.)
2. **Quản lý linh hoạt**: Mỗi bracket có thể có loại khác nhau (Single Elimination, Double Elimination)
3. **Phân chia rõ ràng**: Players có thể tham gia vào các brackets khác nhau
4. **Mở rộng dễ dàng**: Dễ dàng thêm brackets mới cho tournament

## Quy trình Migration

### Bước 1: Backup dữ liệu
```bash
# Backup database trước khi migration
pg_dump your_database > backup_before_migration.sql
```

### Bước 2: Chạy migration script
```bash
# Chạy script migration
npm run migrate:brackets
```

### Bước 3: Kiểm tra kết quả
Script sẽ hiển thị:
- Số lượng tournaments đã migration
- Số lượng tournaments đã bỏ qua
- Chi tiết từng bracket được tạo

## Chi tiết Migration

### Những gì script migration làm:

1. **Tìm tournaments có rounds**: Chỉ migration những tournament đã có rounds
2. **Tạo bracket mặc định**: Tạo "Main Bracket" cho mỗi tournament
3. **Cập nhật rounds**: Chuyển rounds từ tournament sang bracket
4. **Giữ nguyên matches**: Tất cả matches và kết nối được giữ nguyên
5. **Publish documents**: Tất cả documents được publish tự động

### Cấu trúc dữ liệu sau migration:

```json
{
  "tournament": {
    "id": 1,
    "name": "Tournament Name",
    "brackets": [
      {
        "id": 1,
        "name": "Tournament Name - Main Bracket",
        "bracketType": "Single Elimination",
        "order": 1,
        "rounds": [
          {
            "id": 1,
            "name": "Round 1",
            "matches": [...]
          }
        ]
      }
    ]
  }
}
```

## API Endpoints mới

### 1. Lấy tất cả brackets của tournament
```http
GET /api/tournaments/{id}/brackets
Authorization: Bearer {jwt}
```

### 2. Tạo bracket mới
```http
POST /api/tournaments/{id}/brackets
Authorization: Bearer {jwt}
Content-Type: application/json

{
  "data": {
    "name": "Consolation Bracket",
    "bracketType": "Single Elimination",
    "order": 2,
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-02T00:00:00.000Z",
    "maxParticipants": 8,
    "advanceToNextBracket": 2
  }
}
```

### 3. Lấy thông tin bracket (cập nhật)
```http
GET /api/tournaments/{id}/bracket
Authorization: Bearer {jwt}
```

## Rollback Plan

Nếu cần rollback:

1. **Restore database**: Sử dụng backup đã tạo
2. **Hoặc chạy rollback script** (cần tạo thêm):
```bash
npm run migrate:rollback
```

## Kiểm tra sau migration

### 1. Kiểm tra dữ liệu
```bash
# Kiểm tra tournaments có brackets
curl -H "Authorization: Bearer {jwt}" \
  http://localhost:1337/api/tournaments/{id}/brackets
```

### 2. Kiểm tra API endpoints
- Test tạo tournament mới (tự động tạo bracket)
- Test tạo bracket thêm cho tournament
- Test lấy thông tin brackets

### 3. Kiểm tra frontend
- Đảm bảo UI hiển thị đúng cấu trúc mới
- Test các chức năng quản lý bracket

## Lưu ý quan trọng

1. **Backup trước migration**: Luôn backup database trước khi chạy migration
2. **Test trên staging**: Chạy migration trên môi trường staging trước production
3. **Downtime**: Migration có thể mất vài phút, plan downtime nếu cần
4. **Monitoring**: Theo dõi logs trong quá trình migration
5. **Validation**: Kiểm tra dữ liệu sau migration để đảm bảo tính toàn vẹn

## Troubleshooting

### Lỗi thường gặp:

1. **"Tournament already has brackets"**: Tournament đã được migration trước đó
2. **"Tournament not found"**: Tournament ID không tồn tại
3. **"Permission denied"**: User không có quyền truy cập

### Giải pháp:

1. Kiểm tra logs để xem chi tiết lỗi
2. Verify tournament ID và permissions
3. Chạy lại migration script nếu cần

## Support

Nếu gặp vấn đề trong quá trình migration:
1. Kiểm tra logs của migration script
2. Verify database connection và permissions
3. Contact development team nếu cần hỗ trợ thêm 