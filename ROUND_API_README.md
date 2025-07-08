# Round API Documentation

## Endpoints

### 1. Lấy rounds theo Tournament ID với populate đầy đủ

**Endpoint:** `GET /api/rounds/tournament/:tournamentId`

**Mô tả:** Lấy tất cả rounds thuộc về một tournament cụ thể với populate đầy đủ các trường liên quan.

**Parameters:**
- `tournamentId` (path parameter): ID của tournament

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Round 1",
      "order": 1,
      "startTime": "2024-01-01T10:00:00.000Z",
      "endTime": "2024-01-01T12:00:00.000Z",
      "tournament": {
        "id": 1,
        "name": "Tournament Name",
        "description": "Tournament Description",
        // ... tất cả trường của tournament
      },
      "matches": [
        {
          "id": 1,
          "name": "Match 1",
          "playerName1": "Player 1",
          "playerName2": "Player 2",
          "winner": "player1",
          "startTime": "2024-01-01T10:00:00.000Z",
          "endTime": "2024-01-01T11:00:00.000Z",
          "matchNumber": 1,
          "score1": 21,
          "score2": 19,
          "note": "Match note",
          "statusMatch": "complated",
          "nextMatchWinner": {
            // ... thông tin match tiếp theo cho winner
          },
          "nextMatchLoser": {
            // ... thông tin match tiếp theo cho loser
          },
          "previousMatch1": {
            // ... thông tin match trước đó
          },
          "previousMatch2": {
            // ... thông tin match trước đó
          },
          "round": {
            // ... thông tin round
          },
          "tournament": {
            // ... thông tin tournament
          }
        }
      ]
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 1,
      "total": 1
    },
    "count": 1
  }
}
```

### 2. Lấy tất cả rounds với populate đầy đủ

**Endpoint:** `GET /api/rounds/with-populate`

**Mô tả:** Lấy tất cả rounds với populate đầy đủ, có thể filter và paginate.

**Query Parameters:**
- `filters` (optional): Các filter để lọc rounds
- `pagination.page` (optional): Trang hiện tại (default: 1)
- `pagination.pageSize` (optional): Số lượng items mỗi trang (default: 25)

**Ví dụ:**
```
GET /api/rounds/with-populate?filters[tournament][$eq]=1&pagination[page]=1&pagination[pageSize]=10
```

**Response:** Tương tự như endpoint trên

## Cách sử dụng

### 1. Lấy rounds của tournament cụ thể:
```javascript
// Frontend
const response = await fetch('/api/rounds/tournament/1');
const data = await response.json();
console.log(data.data); // Array of rounds
```

### 2. Lấy tất cả rounds với filter:
```javascript
// Frontend
const response = await fetch('/api/rounds/with-populate?filters[tournament][$eq]=1');
const data = await response.json();
console.log(data.data); // Array of rounds
```

### 3. Sử dụng với pagination:
```javascript
// Frontend
const response = await fetch('/api/rounds/with-populate?pagination[page]=1&pagination[pageSize]=5');
const data = await response.json();
console.log(data.data); // Array of rounds
```

## Lưu ý

- Tất cả endpoints đều populate đầy đủ các trường liên quan
- Rounds được sắp xếp theo thứ tự `order` tăng dần
- API trả về format chuẩn của Strapi với `data` và `meta`
- Có xử lý lỗi và validation đầy đủ
- Sử dụng Document API Service thay vì Entity Service để có thêm thông tin pagination 