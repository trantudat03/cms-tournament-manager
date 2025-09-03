/**
 * Test file cho Player API theo System Tournament
 * Chạy với: node test-player-api.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:1337/api';
const SYSTEM_TOURNAMENT_ID = 1; // Thay đổi theo ID thực tế
const JWT_TOKEN = 'your-jwt-token-here'; // Thay đổi theo JWT token thực tế

// Cấu hình axios với JWT token
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Test data
const testPlayer = {
  name: 'Test Player',
  rankLevel: 'Pro',
  countryCode: 'VN',
  birthDate: '1990-01-01',
  gender: 'Male',
  statusPlayer: 'Active',
  rankPoint: 1000
};

async function testPlayerAPI() {
  console.log('🚀 Bắt đầu test Player API...\n');

  try {
    // Test 1: Lấy danh sách players theo system-tournament
    console.log('1. Test lấy danh sách players...');
    const listResponse = await api.get(`/players/system-tournament/${SYSTEM_TOURNAMENT_ID}`);
    console.log('✅ Lấy danh sách thành công:', listResponse.data.meta.pagination.total, 'players');
    console.log('');

    // Test 2: Tạo player mới
    console.log('2. Test tạo player mới...');
    const createResponse = await api.post(`/players/system-tournament/${SYSTEM_TOURNAMENT_ID}`, testPlayer);
    const newPlayerId = createResponse.data.data.id;
    console.log('✅ Tạo player thành công, ID:', newPlayerId);
    console.log('');

    // Test 3: Lấy thông tin chi tiết player
    console.log('3. Test lấy thông tin chi tiết player...');
    const detailResponse = await api.get(`/players/${newPlayerId}/system-tournament/${SYSTEM_TOURNAMENT_ID}`);
    console.log('✅ Lấy thông tin chi tiết thành công:', detailResponse.data.data.name);
    console.log('');

    // Test 4: Cập nhật player
    console.log('4. Test cập nhật player...');
    const updateData = {
      name: 'Updated Test Player',
      rankPoint: 1500
    };
    const updateResponse = await api.put(`/players/${newPlayerId}/system-tournament/${SYSTEM_TOURNAMENT_ID}`, updateData);
    console.log('✅ Cập nhật thành công:', updateResponse.data.data.name);
    console.log('');

    // Test 5: Tìm kiếm players
    console.log('5. Test tìm kiếm players...');
    const searchResponse = await api.get(`/players/system-tournament/${SYSTEM_TOURNAMENT_ID}/search?query=Test`);
    console.log('✅ Tìm kiếm thành công:', searchResponse.data.data.length, 'kết quả');
    console.log('');

    // Test 6: Lấy thống kê
    console.log('6. Test lấy thống kê...');
    const statsResponse = await api.get(`/players/system-tournament/${SYSTEM_TOURNAMENT_ID}/stats`);
    console.log('✅ Lấy thống kê thành công:');
    console.log('   - Tổng players:', statsResponse.data.data.totalPlayers);
    console.log('   - Active players:', statsResponse.data.data.activePlayers);
    console.log('   - Average rank point:', statsResponse.data.data.averageRankPoint);
    console.log('');

    // Test 7: Thêm player vào system-tournament (nếu player đã tồn tại)
    console.log('7. Test thêm player vào system-tournament...');
    try {
      const addResponse = await api.post(`/players/${newPlayerId}/system-tournament/${SYSTEM_TOURNAMENT_ID}/add`);
      console.log('❌ Lỗi: Player đã có trong system tournament');
    } catch (error) {
      if (error.response?.data?.error?.message?.includes('already in this system tournament')) {
        console.log('✅ Test thành công: Player đã có trong system tournament');
      } else {
        console.log('❌ Lỗi không mong đợi:', error.response?.data?.error?.message);
      }
    }
    console.log('');

    // Test 8: Xóa player khỏi system-tournament
    console.log('8. Test xóa player khỏi system-tournament...');
    const deleteResponse = await api.delete(`/players/${newPlayerId}/system-tournament/${SYSTEM_TOURNAMENT_ID}`);
    console.log('✅ Xóa thành công:', deleteResponse.data.message);
    console.log('');

    console.log('🎉 Tất cả test đã hoàn thành thành công!');

  } catch (error) {
    console.error('❌ Lỗi:', error.response?.data?.error?.message || error.message);
    
    if (error.response?.status === 401) {
      console.log('💡 Gợi ý: Kiểm tra JWT_TOKEN có đúng không');
    }
    
    if (error.response?.status === 403) {
      console.log('💡 Gợi ý: User không có quyền truy cập system tournament này');
    }
    
    if (error.response?.status === 404) {
      console.log('💡 Gợi ý: Kiểm tra SYSTEM_TOURNAMENT_ID có đúng không');
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Gợi ý: Đảm bảo Strapi server đang chạy trên port 1337');
    }
  }
}

// Chạy test
testPlayerAPI(); 