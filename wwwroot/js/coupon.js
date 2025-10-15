/**
 * 優惠券頁面邏輯
 */

// 全局變數
let venueData = null;
let storeData = null;
const TOTAL_VENUES = 15;

/**
 * 初始化頁面
 */
async function init() {
  // 取得 userId（如果沒有則使用預設值）
  const userId = Utils.getUrlParam('userId') || 'guest';

  // 顯示 Loading
  Utils.showLoading();

  // 載入店家資料
  storeData = await Utils.loadStoreData();

  // 嘗試載入 API 資料
  let result = { success: false };

  if (userId !== 'guest') {
    result = await API.getVenues(userId);
  }

  Utils.hideLoading();

  // 即使 API 失敗也使用預設資料繼續渲染
  if (!result.success) {
    console.warn('API 載入失敗或無 userId，使用預設資料顯示所有店家');
    venueData = {
      completedVenues: [],
      coupon: [],
      requiredVenues: [],
      doneCount: 0,
      totalRequired: TOTAL_VENUES
    };
  } else {
    venueData = result.data;
  }

  // 渲染頁面
  renderCoupons();

  // 綁定 URL 參數到導航按鈕
  if (userId !== 'guest') {
    updateNavLinks(userId);
  }
}

/**
 * 更新導航連結的 URL 參數
 * @param {string} userId - 使用者 ID
 */
function updateNavLinks(userId) {
  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(btn => {
    const currentHref = btn.getAttribute('href');
    if (currentHref && !currentHref.includes('userId')) {
      btn.setAttribute('href', `${currentHref}?userId=${userId}`);
    }
  });
}

/**
 * 渲染優惠券網格
 */
function renderCoupons() {
  const grid = document.getElementById('couponGrid');
  const coupons = venueData.coupon || [];

  // 建立優惠券 Map 以便快速查找
  // 將 vendor01 轉換為 venue01 格式
  const couponMap = {};
  coupons.forEach(coupon => {
    const venueId = coupon.vendorid.replace('vendor', 'venue');
    couponMap[venueId] = coupon;
  });

  grid.innerHTML = '';

  for (let i = 1; i <= TOTAL_VENUES; i++) {
    const venueId = `venue${String(i).padStart(2, '0')}`;
    const coupon = couponMap[venueId];
    const isUsed = Storage.isCouponUsed(venueId);

    const couponItem = createCouponItem(venueId, coupon, isUsed);
    grid.appendChild(couponItem);
  }
}

/**
 * 建立優惠券項目元素
 * @param {string} venueId - 場館 ID
 * @param {Object|null} coupon - 優惠券資料
 * @param {boolean} isUsed - 是否已使用
 * @returns {HTMLElement} 優惠券項目元素
 */
function createCouponItem(venueId, coupon, isUsed) {
  const item = document.createElement('div');

  // 判斷狀態
  let status = 'unavailable';
  if (coupon && !isUsed) {
    status = 'available';
  } else if (coupon && isUsed) {
    status = 'used';
  }

  item.className = `coupon-item ${status}`;

  const store = storeData[venueId];

  // 場館圖片
  if (store && store.image) {
    const img = document.createElement('img');
    img.className = 'venue-image';
    img.src = store.image;
    img.alt = store.name;
    img.onerror = function() {
      this.style.display = 'none';
    };
    item.appendChild(img);
  }

  // 已使用標記（覆蓋在圖片上）
  if (isUsed) {
    const usedMark = document.createElement('div');
    usedMark.className = 'used-mark';
    usedMark.textContent = '已使用';
    item.appendChild(usedMark);
  }

  // 店家名稱
  const name = document.createElement('div');
  name.className = 'venue-name';
  name.textContent = store ? store.name : venueId;
  item.appendChild(name);

  // 綁定點擊事件
  item.addEventListener('click', () => handleCouponClick(venueId, coupon, isUsed));

  return item;
}

/**
 * 處理優惠券點擊事件
 * @param {string} venueId - 場館 ID
 * @param {Object|null} coupon - 優惠券資料
 * @param {boolean} isUsed - 是否已使用
 */
function handleCouponClick(venueId, coupon, isUsed) {
  // 取得店家名稱
  const store = storeData[venueId];
  const storeName = store ? store.name : venueId;

  if (!coupon) {
    // 沒有優惠券 - 顯示未完成任務提示
    showModal(
      '尚未完成任務',
      '您還沒有完成此場館的任務，無法獲得優惠券。',
      [
        { text: '確定', className: 'primary', onClick: closeModal }
      ]
    );
  } else if (isUsed) {
    // 已使用 - 顯示已使用提示
    showModal(
      '優惠券已使用',
      '此優惠券已經使用過了，無法重複使用。',
      [
        { text: '確定', className: 'primary', onClick: closeModal }
      ]
    );
  } else {
    // 可用 - 顯示確認使用對話框
    showModal(
      '確認使用優惠券',
      `確定要使用「${storeName}」的優惠券嗎？使用後將無法復原。`,
      [
        { text: '取消', className: 'secondary', onClick: closeModal },
        { text: '確認使用', className: 'primary', onClick: () => confirmUseCoupon(venueId, coupon) }
      ]
    );
  }
}

/**
 * 確認使用優惠券
 * @param {string} venueId - 場館 ID
 * @param {Object} coupon - 優惠券資料
 */
function confirmUseCoupon(venueId, coupon) {
  const success = Storage.markCouponAsUsed(venueId);

  if (success) {
    closeModal();
    // 重新渲染頁面
    renderCoupons();

    // 顯示成功提示並顯示優惠券圖片
    const imageUrl = coupon.imgurl ? `${API_BASE_URL}${coupon.imgurl}` : null;
    showModal(
      '使用成功',
      '優惠券已成功使用！',
      [
        { text: '確定', className: 'primary', onClick: closeModal }
      ],
      imageUrl
    );
  } else {
    closeModal();
    Utils.showError('操作失敗，請稍後再試');
  }
}

/**
 * 顯示模態對話框
 * @param {string} title - 標題
 * @param {string} body - 內容
 * @param {Array} buttons - 按鈕配置 [{text, className, onClick}]
 * @param {string} imageUrl - 可選的圖片 URL
 */
function showModal(title, body, buttons, imageUrl = null) {
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalButtons = document.getElementById('modalButtons');

  modalTitle.textContent = title;

  // 清空 modalBody 並重建內容
  modalBody.innerHTML = '';

  // 如果有圖片 URL，先顯示圖片
  if (imageUrl) {
    const img = document.createElement('img');
    img.className = 'modal-image';
    img.src = imageUrl;
    img.alt = '優惠券';
    img.style.width = '100%';
    img.style.maxWidth = '400px';
    img.style.marginBottom = '1rem';
    img.style.borderRadius = '8px';
    img.onerror = function() {
      this.style.display = 'none';
    };
    modalBody.appendChild(img);
  }

  // 顯示文字內容
  const textContent = document.createElement('p');
  textContent.textContent = body;
  textContent.style.margin = '0';
  modalBody.appendChild(textContent);

  // 清空並重建按鈕
  modalButtons.innerHTML = '';
  buttons.forEach(btnConfig => {
    const btn = document.createElement('button');
    btn.className = `modal-btn ${btnConfig.className}`;
    btn.textContent = btnConfig.text;
    btn.addEventListener('click', btnConfig.onClick);
    modalButtons.appendChild(btn);
  });

  modal.classList.add('show');
}

/**
 * 關閉模態對話框
 */
function closeModal() {
  const modal = document.getElementById('modal');
  modal.classList.remove('show');
}

// 點擊模態背景關閉
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modal');
  // modal.addEventListener('click', (e) => {
  //   if (e.target === modal) {
  //     closeModal();
  //   }
  // });
});

// 頁面載入時初始化
document.addEventListener('DOMContentLoaded', init);
