/**
 * LocalStorage 管理
 */
const Storage = {
  STORAGE_KEY: 'stamp_used_coupons',

  /**
   * 取得已使用的優惠券列表
   * @returns {Object} 已使用優惠券的物件 { vendorId: timestamp }
   */
  getUsedCoupons() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Storage read error:', error);
      return {};
    }
  },

  /**
   * 標記優惠券為已使用
   * @param {string} vendorId - 廠商 ID
   * @returns {boolean} 是否成功
   */
  markCouponAsUsed(vendorId) {
    try {
      const usedCoupons = this.getUsedCoupons();
      usedCoupons[vendorId] = new Date().toISOString();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(usedCoupons));
      return true;
    } catch (error) {
      console.error('Storage write error:', error);
      return false;
    }
  },

  /**
   * 檢查優惠券是否已使用
   * @param {string} vendorId - 廠商 ID
   * @returns {boolean} 是否已使用
   */
  isCouponUsed(vendorId) {
    const usedCoupons = this.getUsedCoupons();
    return !!usedCoupons[vendorId];
  }
};
