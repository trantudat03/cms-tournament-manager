# Bracket API Documentation

## Tổng quan

Hệ thống bracket hỗ trợ quản lý các brackets trong tournament với cấu trúc: `Tournament → Bracket → Round → Match`.

## Cấu trúc dữ liệu

### Bracket Schema
```json
{
  "id": 1,
  "name": "Main Bracket",
  "bracketType": "Single Elimination" | "Double Elimination",
  "order": 1,
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-01-02T00:00:00.000Z",
  "bracketStatus": "upcoming" | "active" | "completed",
  "maxParticipants": 8,
  "currentParticipants": 0,
  "advanceToNextBracket": 2,
  "tournament": { "id": 1, "name": "Tournament Name" },
  "rounds": [...],
  "players": [...]
}
```

### Round Schema
```json
{
  "id": 1,
  "name": "Round 1",
  "order": 1,
  "startTime": "2024-01-01T10:00:00.000Z",
  "endTime": "2024-01-01T12:00:00.000Z",
  "bracket": { "id": 1, "name": "Main Bracket" },
  "matches": [...]
}
```

### Match Schema
```json
{
  "id": 1,
  "name": "Match 1",
  "playerName1": "Player 1",
  "playerName2": "Player 2",
  "winner": "Player 1",
  "startTime": "2024-01-01T10:00:00.000Z",
  "endTime": "2024-01-01T11:00:00.000Z",
  "matchNumber": 1,
  "score1": 2,
  "score2": 1,
  "note": "Match note",
  "statusMatch": "pending" | "active" | "completed" | "cancelled",
  "round": { "id": 1, "name": "Round 1" },
  "nextMatchWinner": { "id": 5, "name": "Match 5" },
  "previousMatch1": { "id": 1, "name": "Match 1" },
  "previousMatch2": { "id": 2, "name": "Match 2" }
}
```

## API Endpoints

### 1. Lấy thông tin tournament với brackets đầy đủ

**Endpoint:** `GET /api/tournaments/{tournamentId}/bracket`

**Headers:**
```
Authorization: Bearer {jwt}
Content-Type: application/json
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "Tournament Name",
    "description": "Tournament Description",
    "maxParticipants": 8,
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-02T00:00:00.000Z",
    "statusTournament": "upcoming",
    "brackets": [
      {
        "id": 1,
        "name": "Main Bracket",
        "bracketType": "Single Elimination",
        "order": 1,
        "bracketStatus": "upcoming",
        "maxParticipants": 8,
        "currentParticipants": 0,
        "rounds": [
          {
            "id": 1,
            "name": "Round 1",
            "order": 1,
            "matches": [
              {
                "id": 1,
                "name": "Match 1",
                "playerName1": "",
                "playerName2": "",
                "statusMatch": "pending",
                "score1": 0,
                "score2": 0,
                "nextMatchWinner": { "id": 5 }
              }
            ]
          },
          {
            "id": 2,
            "name": "Semi-Final",
            "order": 2,
            "matches": [...]
          },
          {
            "id": 3,
            "name": "Final",
            "order": 3,
            "matches": [...]
          }
        ]
      }
    ]
  }
}
```

**Error Responses:**
```json
// 401 Unauthorized
{
  "error": {
    "status": 401,
    "name": "UnauthorizedError",
    "message": "Missing or invalid JWT"
  }
}

// 403 Forbidden
{
  "error": {
    "status": 403,
    "name": "ForbiddenError", 
    "message": "You are not allowed to access this tournament"
  }
}

// 404 Not Found
{
  "error": {
    "status": 404,
    "name": "NotFoundError",
    "message": "Tournament not found"
  }
}
```

### 2. Lấy danh sách brackets của tournament

**Endpoint:** `GET /api/tournaments/{tournamentId}/brackets`

**Headers:**
```
Authorization: Bearer {jwt}
Content-Type: application/json
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Main Bracket",
      "bracketType": "Single Elimination",
      "order": 1,
      "bracketStatus": "upcoming",
      "maxParticipants": 8,
      "currentParticipants": 0,
      "rounds": [...]
    },
    {
      "id": 2,
      "name": "Consolation Bracket",
      "bracketType": "Single Elimination", 
      "order": 2,
      "bracketStatus": "upcoming",
      "maxParticipants": 4,
      "currentParticipants": 0,
      "rounds": [...]
    }
  ]
}
```

### 3. Lấy chi tiết một bracket

**Endpoint:** `GET /api/brackets/{bracketId}`

**Headers:**
```
Authorization: Bearer {jwt}
Content-Type: application/json
```

**Query Parameters:**
```
?populate[rounds][populate][matches]=*
?populate[tournament]=*
?populate[players]=*
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "Main Bracket",
    "bracketType": "Single Elimination",
    "order": 1,
    "bracketStatus": "upcoming",
    "maxParticipants": 8,
    "currentParticipants": 0,
    "tournament": {
      "id": 1,
      "name": "Tournament Name"
    },
    "rounds": [
      {
        "id": 1,
        "name": "Round 1",
        "order": 1,
        "matches": [...]
      }
    ],
    "players": [
      {
        "id": 1,
        "name": "Player 1",
        "email": "player1@example.com"
      }
    ]
  }
}
```

### 4. Tạo bracket mới cho tournament

**Endpoint:** `POST /api/tournaments/{tournamentId}/brackets`

**Headers:**
```
Authorization: Bearer {jwt}
Content-Type: application/json
```

**Request Body:**
```json
{
  "data": {
    "name": "Consolation Bracket",
    "bracketType": "Single Elimination",
    "order": 2,
    "startDate": "2024-01-15T00:00:00.000Z",
    "endDate": "2024-01-16T00:00:00.000Z",
    "bracketStatus": "upcoming",
    "maxParticipants": 8,
    "currentParticipants": 0,
    "advanceToNextBracket": 2
  }
}
```

**Response:**
```json
{
  "data": {
    "id": 2,
    "name": "Consolation Bracket",
    "bracketType": "Single Elimination",
    "order": 2,
    "bracketStatus": "upcoming",
    "maxParticipants": 8,
    "currentParticipants": 0,
    "rounds": [...]
  },
  "message": "Bracket created successfully"
}
```

### 5. Cập nhật bracket

**Endpoint:** `PUT /api/brackets/{bracketId}`

**Headers:**
```
Authorization: Bearer {jwt}
Content-Type: application/json
```

**Request Body:**
```json
{
  "data": {
    "name": "Updated Bracket Name",
    "bracketStatus": "active",
    "currentParticipants": 4
  }
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "Updated Bracket Name",
    "bracketStatus": "active",
    "currentParticipants": 4,
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

### 6. Xóa bracket

**Endpoint:** `DELETE /api/brackets/{bracketId}`

**Headers:**
```
Authorization: Bearer {jwt}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "Bracket Name"
  }
}
```

### 7. Tái tạo matches cho bracket

**Endpoint:** `POST /api/tournaments/{tournamentId}/brackets/{bracketId}/regenerate-matches`

**Headers:**
```
Authorization: Bearer {jwt}
Content-Type: application/json
```

**Response:**
```json
{
  "data": {
    "bracket": {
      "id": 1,
      "name": "Main Bracket",
      "rounds": [...]
    }
  },
  "message": "Bracket matches regenerated successfully"
}
```

### 8. Tạo bracket tự động cho tournament

**Endpoint:** `POST /api/tournaments/{tournamentId}/create-bracket`

**Headers:**
```
Authorization: Bearer {jwt}
Content-Type: application/json
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "Tournament Name",
    "brackets": [
      {
        "id": 1,
        "name": "Tournament Name - Main Bracket",
        "bracketType": "Single Elimination",
        "rounds": [...]
      }
    ]
  },
  "message": "Bracket created successfully"
}
```

## Các trạng thái (Status)

### Bracket Status
- `upcoming`: Sắp diễn ra
- `active`: Đang diễn ra
- `completed`: Đã hoàn thành

### Match Status
- `pending`: Chờ diễn ra
- `active`: Đang diễn ra
- `completed`: Đã hoàn thành
- `cancelled`: Đã hủy

### Bracket Type
- `Single Elimination`: Loại trực tiếp đơn
- `Double Elimination`: Loại trực tiếp kép

## Ví dụ sử dụng Frontend

### React Hook để lấy tournament với brackets

```javascript
import { useState, useEffect } from 'react';

const useTournamentBrackets = (tournamentId, token) => {
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/tournaments/${tournamentId}/bracket`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        setTournament(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId && token) {
      fetchTournament();
    }
  }, [tournamentId, token]);

  return { tournament, loading, error };
};
```

### Component hiển thị bracket

```javascript
const TournamentBracket = ({ tournament }) => {
  if (!tournament?.brackets) return <div>No brackets found</div>;

  return (
    <div className="tournament-brackets">
      {tournament.brackets.map(bracket => (
        <div key={bracket.id} className="bracket">
          <h2>{bracket.name}</h2>
          <div className="bracket-status">{bracket.bracketStatus}</div>
          
          <div className="rounds">
            {bracket.rounds.map(round => (
              <div key={round.id} className="round">
                <h3>{round.name}</h3>
                <div className="matches">
                  {round.matches.map(match => (
                    <MatchComponent key={match.id} match={match} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
```

### Hook để tạo bracket mới

```javascript
const useCreateBracket = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createBracket = async (tournamentId, bracketData, token) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/tournaments/${tournamentId}/brackets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: bracketData })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create bracket');
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createBracket, loading, error };
};
```

## Lưu ý quan trọng

1. **Authentication**: Tất cả API đều yêu cầu JWT token trong header Authorization
2. **Authorization**: User chỉ có thể truy cập tournament mà họ sở hữu
3. **Populate**: Sử dụng query parameter `populate` để lấy thêm thông tin relations
4. **Error Handling**: Luôn xử lý các trường hợp lỗi 401, 403, 404, 500
5. **Loading States**: Hiển thị loading state khi gọi API
6. **Optimistic Updates**: Có thể cập nhật UI trước khi nhận response từ server

## Testing

### Test với curl

```bash
# Lấy tournament với brackets
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:1337/api/tournaments/1/bracket

# Tạo bracket mới
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data":{"name":"Test Bracket","bracketType":"Single Elimination","order":1}}' \
  http://localhost:1337/api/tournaments/1/brackets
``` 