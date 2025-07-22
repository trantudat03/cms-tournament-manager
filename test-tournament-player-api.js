/**
 * Test file cho Tournament Player API
 * Chạy với: node test-tournament-player-api.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:1337/api';
const TOURNAMENT_ID = 1; // Thay đổi theo ID thực tế
const PLAYER_ID = 1; // Thay đổi theo ID thực tế
const JWT_TOKEN = 'your-jwt-token-here'; // Thay đổi theo JWT token thực tế

// Cấu hình axios với JWT token
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testTournamentPlayerAPI() {
  console.log('🚀 Bắt đầu test Tournament Player API...\n');

  try {
    // Test 1: Lấy danh sách players trong tournament
    console.log('1. Test lấy danh sách players trong tournament...');
    const listResponse = await api.get(`/tournaments/${TOURNAMENT_ID}/players`);
    console.log('✅ Lấy danh sách thành công:', listResponse.data.meta.pagination.total, 'players');
    console.log('');

    // Test 2: Thêm player vào tournament
    console.log('2. Test thêm player vào tournament...');
    const addResponse = await api.post(`/tournaments/${TOURNAMENT_ID}/players/${PLAYER_ID}/add`);
    console.log('✅ Thêm player thành công:', addResponse.data.message);
    console.log('   - Current participants:', addResponse.data.data.currentParticipants);
    console.log('');

    // Test 3: Thử thêm lại player (sẽ báo lỗi)
    console.log('3. Test thêm lại player (sẽ báo lỗi)...');
    try {
      await api.post(`/tournaments/${TOURNAMENT_ID}/players/${PLAYER_ID}/add`);
      console.log('❌ Lỗi: Không nên thành công');
    } catch (error) {
      if (error.response?.data?.error?.message?.includes('already in this tournament')) {
        console.log('✅ Test thành công: Player đã có trong tournament');
      } else {
        console.log('❌ Lỗi không mong đợi:', error.response?.data?.error?.message);
      }
    }
    console.log('');

    // Test 4: Thêm nhiều players vào tournament
    console.log('4. Test thêm nhiều players vào tournament...');
    const multiplePlayers = [2, 3, 4]; // Thay đổi theo IDs thực tế
    const bulkAddResponse = await api.post(`/tournaments/${TOURNAMENT_ID}/players/bulk-add`, {
      playerIds: multiplePlayers
    });
    console.log('✅ Thêm nhiều players thành công:', bulkAddResponse.data.message);
    console.log('   - Current participants:', bulkAddResponse.data.data.currentParticipants);
    console.log('');

    // Test 5: Lấy danh sách players sau khi thêm
    console.log('5. Test lấy danh sách players sau khi thêm...');
    const updatedListResponse = await api.get(`/tournaments/${TOURNAMENT_ID}/players`);
    console.log('✅ Lấy danh sách thành công:', updatedListResponse.data.meta.pagination.total, 'players');
    console.log('');

    // Test 6: Xóa player khỏi tournament
    console.log('6. Test xóa player khỏi tournament...');
    const removeResponse = await api.delete(`/tournaments/${TOURNAMENT_ID}/players/${PLAYER_ID}/remove`);
    console.log('✅ Xóa player thành công:', removeResponse.data.message);
    console.log('   - Current participants:', removeResponse.data.data.currentParticipants);
    console.log('');

    // Test 7: Thử xóa lại player (sẽ báo lỗi)
    console.log('7. Test xóa lại player (sẽ báo lỗi)...');
    try {
      await api.delete(`/tournaments/${TOURNAMENT_ID}/players/${PLAYER_ID}/remove`);
      console.log('❌ Lỗi: Không nên thành công');
    } catch (error) {
      if (error.response?.data?.error?.message?.includes('not in this tournament')) {
        console.log('✅ Test thành công: Player không có trong tournament');
      } else {
        console.log('❌ Lỗi không mong đợi:', error.response?.data?.error?.message);
      }
    }
    console.log('');

    // Test 8: Thử thêm player không tồn tại
    console.log('8. Test thêm player không tồn tại...');
    try {
      await api.post(`/tournaments/${TOURNAMENT_ID}/players/99999/add`);
      console.log('❌ Lỗi: Không nên thành công');
    } catch (error) {
      if (error.response?.data?.error?.message?.includes('Player not found')) {
        console.log('✅ Test thành công: Player không tồn tại');
      } else {
        console.log('❌ Lỗi không mong đợi:', error.response?.data?.error?.message);
      }
    }
    console.log('');

    // Test 9: Thử thêm player không thuộc system-tournament
    console.log('9. Test thêm player không thuộc system-tournament...');
    try {
      await api.post(`/tournaments/${TOURNAMENT_ID}/players/999/add`);
      console.log('❌ Lỗi: Không nên thành công');
    } catch (error) {
      if (error.response?.data?.error?.message?.includes('does not belong to this system tournament')) {
        console.log('✅ Test thành công: Player không thuộc system tournament');
      } else {
        console.log('❌ Lỗi không mong đợi:', error.response?.data?.error?.message);
      }
    }
    console.log('');

    console.log('🎉 Tất cả test đã hoàn thành thành công!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Chạy test
testTournamentPlayerAPI(); 