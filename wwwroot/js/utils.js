/**
 * 工具函數
 */
const Utils = {
  /**
   * 從 URL 取得查詢參數
   * @param {string} param - 參數名稱
   * @returns {string|null} 參數值
   */
  getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  },

  /**
   * 顯示 Loading 狀態
   */
  showLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'flex';
    }
  },

  /**
   * 隱藏 Loading 狀態
   */
  hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
    }
  },

  /**
   * 顯示錯誤訊息
   * @param {string} message - 錯誤訊息
   */
  showError(message) {
    const errorDiv = document.getElementById('error');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    } else {
      alert(message);
    }
  },

  /**
   * 隱藏錯誤訊息
   */
  hideError() {
    const errorDiv = document.getElementById('error');
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
  },

  /**
   * 載入集章資料（用於集章頁面）
   * @returns {Promise<Object>} 集章資料 Map
   */
  async loadStampData() {
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(`assets/doc/stamp.json?t=${timestamp}`);
      if (!response.ok) {
        throw new Error('Failed to load stamp data');
      }
      const data = await response.json();

      // 轉換為 Map 以便快速查找
      const stampMap = {};
      data.venues.forEach(venue => {
        stampMap[venue.id] = venue;
      });

      return stampMap;
    } catch (error) {
      console.error('Load stamp data error:', error);
      return {};
    }
  },

  /**
   * 載入店家資料（用於優惠券頁面）
   * @returns {Promise<Object>} 店家資料 Map
   */
  async loadStoreData() {
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(`assets/doc/store.json?t=${timestamp}`);
      if (!response.ok) {
        throw new Error('Failed to load store data');
      }
      const data = await response.json();

      // 轉換為 Map 以便快速查找
      const storeMap = {};
      data.venues.forEach(venue => {
        storeMap[venue.id] = venue;
      });

      return storeMap;
    } catch (error) {
      console.error('Load store data error:', error);
      return {};
    }
  }
};
