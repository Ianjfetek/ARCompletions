// ========================================
// API 配置
// ========================================
// TODO: 請在此填寫您的 API Base URL
const API_BASE_URL = 'https://arcompletions.onrender.com';
// 範例: 'https://api.example.com/api'
// 範例: 'http://localhost:3000/api'
// ========================================

/**
 * API 請求封裝
 */
const API = {
  /**
   * 取得場館資料
   * @param {string} userId - 使用者 ID
   * @returns {Promise<Object>} 場館資料
   */
  async getVenues(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/venues/${userId}`);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('API Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};
