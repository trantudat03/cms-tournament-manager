# User Search API

API này cho phép tìm kiếm user theo email hoặc số điện thoại. Chỉ user có role `system-owner` mới được phép sử dụng API này.

## Endpoint

**GET** `/api/auth/search-user`

## Quyền truy cập

- **Authentication**: Bắt buộc (JWT token)
- **Role**: Chỉ user có `type = "system-owner"` mới được phép

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | Yes | Chuỗi tìm kiếm để tìm trong cả email và số điện thoại |

**Lưu ý**: API sẽ tự động tìm kiếm chuỗi này trong cả trường `email` và `numberphone` của user.

## Response Format

### Success Response (200)

```json
{
  "data": [
    {
      "id": 1,
      "documentId": 1,
      "username": "username",
      "email": "user@example.com",
      "numberphone": "0123456789"
    }
  ],
  "meta": {
    "count": 1
  }
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": {
    "status": 400,
    "name": "BadRequestError",
    "message": "Please provide search parameter"
  }
}
```

#### 403 Forbidden
```json
{
  "error": {
    "status": 403,
    "name": "ForbiddenError",
    "message": "Access denied. Only system-owner can search users."
  }
}
```

#### 401 Unauthorized
```json
{
  "error": {
    "status": 401,
    "name": "UnauthorizedError",
    "message": "Missing or invalid authorization header"
  }
}
```

## Ví dụ sử dụng

### Tìm kiếm user

```bash
curl -X GET "http://localhost:1337/api/auth/search-user?search=john" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Tìm kiếm theo số điện thoại

```bash
curl -X GET "http://localhost:1337/api/auth/search-user?search=0123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Tìm kiếm theo email

```bash
curl -X GET "http://localhost:1337/api/auth/search-user?search=testuser@example.com" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Lưu ý quan trọng

1. **Quyền truy cập**: API này chỉ dành cho user có `type = "system-owner"`. User thường (`type = "customer"`) sẽ nhận được lỗi 403 Forbidden.

2. **Tìm kiếm mờ**: API sử dụng tìm kiếm mờ (fuzzy search) với operator `$contains` và `$or`, có nghĩa là sẽ tìm tất cả user có email HOẶC số điện thoại chứa chuỗi được cung cấp.

3. **Dữ liệu trả về**: API chỉ trả về các trường cần thiết:
   - `id`: ID của user
   - `documentId`: Document ID của user (dùng để gán cho player)
   - `username`: Username của user
   - `email`: Email của user
   - `numberphone`: Số điện thoại của user

4. **Bảo mật**: API không trả về các thông tin nhạy cảm như password, resetPasswordToken, confirmationToken.

5. **Pagination**: Hiện tại API không hỗ trợ pagination, sẽ trả về tất cả kết quả tìm được.

## JavaScript/TypeScript Example

```javascript
// Tìm kiếm user
const searchUsers = async (searchTerm, token) => {
  try {
    const response = await fetch(`http://localhost:1337/api/auth/search-user?search=${encodeURIComponent(searchTerm)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

// Sử dụng
searchUsers('john', 'your-jwt-token')
  .then(result => {
    console.log('Found users:', result.data);
  })
  .catch(error => {
    console.error('Search failed:', error);
  });
```

## Testing

Để test API này, bạn cần:

1. Đăng nhập với tài khoản có `type = "system-owner"`
2. Lấy JWT token từ response đăng nhập
3. Sử dụng token đó trong header Authorization khi gọi API search

```bash
# Đăng nhập để lấy token
curl -X POST "http://localhost:1337/api/auth/local" \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "system-owner@example.com",
    "password": "password123"
  }'

# Sử dụng token để search user
curl -X GET "http://localhost:1337/api/auth/search-user?search=test" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_FROM_LOGIN"
```

## Sử dụng với Player Management API

API search user này thường được sử dụng kết hợp với Player Management API để gán user cho player. Dưới đây là workflow hoàn chỉnh:

### Bước 1: Tìm kiếm user
```bash
# Tìm kiếm user theo email hoặc số điện thoại
curl -X GET "http://localhost:1337/api/auth/search-user?search=john@example.com" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "documentId": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "numberphone": "0123456789"
    }
  ],
  "meta": {
    "count": 1
  }
}
```

### Bước 2: Gán user cho player

Có 2 cách để gán user cho player:

#### Cách 1: Tạo player mới với user ngay từ đầu
```bash
# Tạo player và gán user cùng lúc
curl -X POST "http://localhost:1337/api/players/system-tournament/456" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Player Name",
    "rankLevel": "Beginner",
    "countryCode": "VN",
    "gender": "Male",
    "statusPlayer": "Active",
    "rankPoint": 1000,
    "userId": "1"
  }'
```

#### Cách 2: Gán user cho player đã tồn tại
```bash
# Gán user cho player đã có
curl -X POST "http://localhost:1337/api/players/123/system-tournament/456/assign-user" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "1"
  }'
```

**Lưu ý quan trọng:**
- Sử dụng `documentId` (không phải `id`) để gán user cho player
- `userId` trong request body phải là `documentId` của user
- Player phải thuộc về system tournament được chỉ định
- Chỉ system-owner mới có quyền thực hiện các thao tác này

### Ví dụ JavaScript hoàn chỉnh:

```javascript
// Bước 1: Tìm kiếm user
const searchUser = async (searchTerm, token) => {
  const response = await fetch(`http://localhost:1337/api/auth/search-user?search=${encodeURIComponent(searchTerm)}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  const data = await response.json();
  return data.data[0]; // Lấy user đầu tiên tìm được
};

// Bước 2a: Tạo player mới với user
const createPlayerWithUser = async (systemTournamentId, playerData, userId, token) => {
  const response = await fetch(`http://localhost:1337/api/players/system-tournament/${systemTournamentId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...playerData,
      userId: userId // Sử dụng documentId
    }),
  });
  
  return await response.json();
};

// Bước 2b: Gán user cho player đã tồn tại
const assignUserToPlayer = async (playerId, systemTournamentId, userId, token) => {
  const response = await fetch(`http://localhost:1337/api/players/${playerId}/system-tournament/${systemTournamentId}/assign-user`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: userId
    }),
  });
  
  return await response.json();
};

// Sử dụng - Cách 1: Tạo player mới với user
const createPlayerWithUserWorkflow = async () => {
  try {
    // Tìm user
    const user = await searchUser('john@example.com', 'your-jwt-token');
    if (!user) {
      console.log('User not found');
      return;
    }
    
    // Tạo player mới với user
    const result = await createPlayerWithUser(
      456, // systemTournamentId
      {
        name: 'John Doe',
        rankLevel: 'Beginner',
        countryCode: 'VN',
        gender: 'Male',
        statusPlayer: 'Active',
        rankPoint: 1000
      },
      user.documentId, // Sử dụng documentId
      'your-jwt-token'
    );
    
    console.log('Player created with user successfully:', result);
  } catch (error) {
    console.error('Error:', error);
  }
};

// Sử dụng - Cách 2: Gán user cho player đã tồn tại
const assignUserWorkflow = async () => {
  try {
    // Tìm user
    const user = await searchUser('john@example.com', 'your-jwt-token');
    if (!user) {
      console.log('User not found');
      return;
    }
    
    // Gán user cho player
    const result = await assignUserToPlayer(
      123, // playerId
      456, // systemTournamentId  
      user.documentId, // Sử dụng documentId
      'your-jwt-token'
    );
    
    console.log('User assigned successfully:', result);
  } catch (error) {
    console.error('Error:', error);
  }
};
``` 