# Tournament Player API

API này cung cấp các endpoint để quản lý players trong tournament với document API service và validation quyền truy cập.

## Yêu cầu

- Tất cả các API đều yêu cầu authentication JWT
- User phải có `documentId` trùng với `userId` trong system-tournament để có quyền truy cập
- Sử dụng Strapi Document API Service (`strapi.documents`)
- Player phải thuộc system-tournament của tournament đó

## Endpoints

### 1. Thêm player vào tournament
```
POST /api/tournaments/:id/players/:playerId/add
```

**Parameters:**
- `id`: Tournament ID
- `playerId`: Player ID

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "Tournament Name",
    "currentParticipants": 5,
    "maxParticipants": 8,
    "players": [
      {
        "id": 1,
        "name": "Player Name",
        "rankLevel": "Pro",
        "avatar": { ... },
        "system_tournaments": [...]
      }
    ],
    "system_tournament": { ... }
  },
  "message": "Player added to tournament successfully"
}
```

### 2. Xóa player khỏi tournament
```
DELETE /api/tournaments/:id/players/:playerId/remove
```

**Parameters:**
- `id`: Tournament ID
- `playerId`: Player ID

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "Tournament Name",
    "currentParticipants": 4,
    "players": [...],
    "system_tournament": { ... }
  },
  "message": "Player removed from tournament successfully"
}
```

### 3. Lấy danh sách players trong tournament
```
GET /api/tournaments/:id/players
```

**Parameters:**
- `id`: Tournament ID

**Query Parameters:**
- `page` (optional): Số trang (mặc định: 1)
- `pageSize` (optional): Số lượng items per page (mặc định: 10)
- `sort` (optional): Sắp xếp (mặc định: 'createdAt:desc')
- `query` (optional): Tìm kiếm theo name, rankLevel, countryCode
- `name` (optional): Lọc theo tên player
- `rankLevel` (optional): Lọc theo rank level
- `countryCode` (optional): Lọc theo mã quốc gia
- `gender` (optional): Lọc theo giới tính (Male, Female, Other)
- `statusPlayer` (optional): Lọc theo trạng thái (Active, Inactive, Suspended)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Player Name",
      "rankLevel": "Pro",
      "countryCode": "VN",
      "gender": "Male",
      "statusPlayer": "Active",
      "rankPoint": 1000,
      "avatar": { ... },
      "system_tournaments": [...],
      "tournaments": [...],
      "matches": [...]
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "pageCount": 1,
      "total": 5
    }
  }
}
```

### 4. Lấy danh sách players có trong system-tournament nhưng không có trong tournament
```
GET /api/tournaments/:id/players/available
```

**Parameters:**
- `id`: Tournament ID

**Query Parameters:**
- `page` (optional): Số trang (mặc định: 1)
- `pageSize` (optional): Số lượng items per page (mặc định: 10)
- `sort` (optional): Sắp xếp (mặc định: 'createdAt:desc')
- `query` (optional): Tìm kiếm theo name, rankLevel, countryCode
- `name` (optional): Lọc theo tên player
- `rankLevel` (optional): Lọc theo rank level
- `countryCode` (optional): Lọc theo mã quốc gia
- `gender` (optional): Lọc theo giới tính (Male, Female, Other)
- `statusPlayer` (optional): Lọc theo trạng thái (Active, Inactive, Suspended)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Player Name",
      "rankLevel": "Pro",
      "countryCode": "VN",
      "gender": "Male",
      "statusPlayer": "Active",
      "rankPoint": 1000,
      "avatar": { ... },
      "system_tournaments": [...],
      "tournaments": [...],
      "matches": [...]
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "pageCount": 1,
      "total": 5
    }
  }
}
```

### 5. Thêm nhiều players vào tournament
```
POST /api/tournaments/:id/players/bulk-add
```

**Parameters:**
- `id`: Tournament ID

**Request Body:**
```json
{
  "playerIds": [1, 2, 3, 4]
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "Tournament Name",
    "currentParticipants": 8,
    "maxParticipants": 8,
    "players": [...],
    "system_tournament": { ... }
  },
  "message": "4 players added to tournament successfully"
}
```

## Authentication

Tất cả các API đều yêu cầu JWT token trong header:

```
Authorization: Bearer <your-jwt-token>
```

## Error Responses

Tất cả các endpoint có thể trả về lỗi với format:

```json
{
  "error": {
    "status": 400,
    "name": "BadRequest",
    "message": "Error message",
    "details": { ... }
  }
}
```

## Các lỗi thường gặp

- `Tournament not found`: Tournament không tồn tại
- `Player not found`: Player không tồn tại
- `Player does not belong to this system tournament`: Player không thuộc system tournament này
- `Player is already in this tournament`: Player đã có trong tournament
- `Player is not in this tournament`: Player không có trong tournament
- `Tournament is full. Cannot add more players`: Tournament đã đầy
- `Cannot add X players. Tournament capacity would be exceeded`: Không thể thêm X players vì sẽ vượt quá sức chứa
- `Some players not found`: Một số players không tồn tại
- `Some players do not belong to this system tournament`: Một số players không thuộc system tournament này
- `Players with IDs [X, Y, Z] are already in this tournament`: Players với IDs [X, Y, Z] đã có trong tournament
- `You are not allowed to access this tournament`: User không có quyền truy cập tournament này
- `Missing or invalid JWT`: Thiếu hoặc JWT không hợp lệ

## Validation Rules

### Thêm player vào tournament:
1. User phải có quyền truy cập tournament (thuộc system-tournament của user)
2. Player phải tồn tại
3. Player phải thuộc system-tournament của tournament
4. Player chưa có trong tournament
5. Tournament chưa đầy (currentParticipants < maxParticipants)

### Xóa player khỏi tournament:
1. User phải có quyền truy cập tournament
2. Player phải có trong tournament

### Lấy danh sách players:
1. User phải có quyền truy cập tournament

### Thêm nhiều players:
1. User phải có quyền truy cập tournament
2. Tất cả players phải tồn tại
3. Tất cả players phải thuộc system-tournament
4. Không có player nào đã có trong tournament
5. Tổng số players sau khi thêm không vượt quá maxParticipants

## Lưu ý

1. Tất cả các endpoint đều yêu cầu authentication JWT
2. User phải có `documentId` trùng với `userId` trong system tournament để có quyền truy cập
3. API sử dụng Strapi Document API Service (`strapi.documents`)
4. Khi thêm/xóa player, `currentParticipants` sẽ được tự động cập nhật
5. API hỗ trợ pagination cho endpoint lấy danh sách players
6. Tất cả các thao tác đều được validate quyền truy cập theo system tournament
7. Player phải thuộc system-tournament của tournament để có thể tham gia

## Ví dụ sử dụng

### Thêm player vào tournament
```bash
curl -X POST \
  http://localhost:1337/api/tournaments/1/players/5/add \
  -H 'Authorization: Bearer your-jwt-token' \
  -H 'Content-Type: application/json'
```

### Thêm nhiều players
```bash
curl -X POST \
  http://localhost:1337/api/tournaments/1/players/bulk-add \
  -H 'Authorization: Bearer your-jwt-token' \
  -H 'Content-Type: application/json' \
  -d '{
    "playerIds": [1, 2, 3, 4]
  }'
```

### Lấy danh sách players trong tournament
```bash
curl -X GET \
  'http://localhost:1337/api/tournaments/1/players?page=1&pageSize=10&query=Pro&gender=Male' \
  -H 'Authorization: Bearer your-jwt-token'
```

### Lấy danh sách players có thể thêm vào tournament
```bash
curl -X GET \
  'http://localhost:1337/api/tournaments/1/players/available?page=1&pageSize=10&rankLevel=Pro' \
  -H 'Authorization: Bearer your-jwt-token'
```

### Xóa player khỏi tournament
```bash
curl -X DELETE \
  http://localhost:1337/api/tournaments/1/players/5/remove \
  -H 'Authorization: Bearer your-jwt-token'
``` 