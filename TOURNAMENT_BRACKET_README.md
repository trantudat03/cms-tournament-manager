# Tournament Bracket System

## Tổng quan

Hệ thống tự động tạo tournament bracket (rounds và matches) dựa trên số lượng participants tối đa của tournament.

## Tính năng

### 1. Tự động tạo bracket khi tạo tournament

Khi tạo một tournament mới với `maxParticipants > 0`, hệ thống sẽ tự động:
- Tính toán số round cần thiết dựa trên số participants
- Tạo các round với tên phù hợp (Round 1, Quarter-Final, Semi-Final, Final)
- Tạo matches cho từng round
- Kết nối các match với nhau (nextMatchWinner, previousMatch1, previousMatch2)

### 2. API Endpoints

#### Tạo tournament mới (tự động tạo bracket)
```http
POST /api/tournaments
Content-Type: application/json

{
  "data": {
    "name": "Tournament Name",
    "description": "Tournament Description",
    "maxParticipants": 8,
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-02T00:00:00.000Z",
    "entryFee": 100,
    "prizePool": 1000,
    "statusTournament": "upcoming",
    "location": "Location"
  }
}
```

#### Tạo bracket cho tournament đã tồn tại
```http
POST /api/tournaments/{id}/create-bracket
```

#### Lấy thông tin bracket của tournament
```http
GET /api/tournaments/{id}/bracket
```

## Logic tính toán

### Số round
- Số round = `Math.ceil(Math.log2(maxParticipants))`
- Ví dụ: 8 participants = 3 rounds, 16 participants = 4 rounds

### Số match trong mỗi round
- Round 1: `Math.ceil(maxParticipants / 2)`
- Round 2+: `Math.ceil(số match round trước / 2)`

### Tên round
- Round cuối: "Final"
- Round gần cuối: "Semi-Final"
- Round gần gần cuối: "Quarter-Final"
- Các round khác: "Round {số}"

## Ví dụ

### Tournament với 8 participants
```
Round 1: 4 matches
Round 2: 2 matches (Semi-Final)
Round 3: 1 match (Final)
```

### Tournament với 16 participants
```
Round 1: 8 matches
Round 2: 4 matches
Round 3: 2 matches (Semi-Final)
Round 4: 1 match (Final)
```

## Cấu trúc dữ liệu

### Round
```json
{
  "id": 1,
  "name": "Round 1",
  "order": 1,
  "tournament": 1,
  "startTime": null,
  "endTime": null,
  "matches": [...]
}
```

### Match
```json
{
  "id": 1,
  "name": "Match 1",
  "playerName1": "",
  "playerName2": "",
  "winner": null,
  "startTime": null,
  "endTime": null,
  "matchNumber": 1,
  "score1": 0,
  "score2": 0,
  "note": "",
  "statusMatch": "pending",
  "round": 1,
  "nextMatchWinner": 5,
  "previousMatch1": null,
  "previousMatch2": null
}
```

## Files đã tạo/cập nhật

1. `src/utils/tournament-bracket.ts` - Utility class cho tournament bracket (sử dụng Document Service API)
2. `src/api/tournament/services/tournament.ts` - Service với methods tạo bracket
3. `src/api/tournament/controllers/tournament.ts` - Controller với create method (sử dụng Document Service API)
4. `src/api/tournament/controllers/tournament-custom.ts` - Custom controller với createBracket và getBracket (sử dụng Document Service API)
5. `src/api/tournament/routes/custom.ts` - Custom routes
6. `src/api/tournament/content-types/tournament/lifecycles.ts` - Lifecycle hook

## Sử dụng

### Tự động (khuyến nghị)
Chỉ cần tạo tournament với `maxParticipants > 0`, hệ thống sẽ tự động tạo bracket.

### Thủ công
Nếu tournament đã tồn tại mà chưa có bracket:
```javascript
// Gọi API
POST /api/tournaments/{tournamentId}/create-bracket
```

### Lấy thông tin bracket
```javascript
// Gọi API
GET /api/tournaments/{tournamentId}/bracket
```

## Lưu ý

- Tournament chỉ có thể tạo bracket một lần
- Cần có `maxParticipants > 0` để tạo bracket
- Bracket sẽ được tạo với tất cả matches ở trạng thái "pending"
- Các match được kết nối với nhau để tạo thành bracket tree
- Hệ thống sử dụng Document Service API để đảm bảo tính nhất quán với Strapi v5
- Tất cả documents được tự động publish sau khi tạo 