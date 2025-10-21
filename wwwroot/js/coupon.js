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
  const completedCount = venueData.doneCount || 0;

  // 建立優惠券 Map 以便快速查找
  // 將 vendor01 轉換為 v001 格式
  const couponMap = {};
  coupons.forEach(coupon => {
    const venueId = coupon.vendorid.replace('vendor', 'v');
    couponMap[venueId] = coupon;
  });

  grid.innerHTML = '';

  // v001-v005 是同一店家，只顯示一次
  const displayedVenues = new Set();

  for (let i = 1; i <= TOTAL_VENUES; i++) {
    const venueId = `v${String(i).padStart(3, '0')}`;

    // v001-v005 只顯示 v001
    if (i >= 1 && i <= 5) {
      if (displayedVenues.has('v001-v005-group')) {
        continue;
      }
      displayedVenues.add('v001-v005-group');
    }

    const coupon = couponMap[venueId];
    const isUsed = Storage.isCouponUsed(venueId);

    const couponItem = createCouponItem(venueId, coupon, isUsed, completedCount);
    grid.appendChild(couponItem);
  }
}

/**
 * 格式化簡介，將地址轉換為 Google Maps 連結
 * @param {string} description - 店家簡介
 * @param {string} address - 店家地址
 * @returns {string} 格式化後的 HTML
 */
function formatDescriptionWithMapLink(description, address) {
  if (!description) return '';

  // 使用正則表達式匹配地址行（📍 開頭）
  const addressPattern = /📍\s*(.+?)(?=\n|$)/;
  const match = description.match(addressPattern);

  if (match && address) {
    const fullAddressLine = match[0]; // 完整的地址行（包含 📍）
    const addressText = match[1].trim(); // 地址文字

    // 建立 Google Maps 連結
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    const addressLink = `📍 <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="address-link">${addressText}</a>`;

    // 替換原始地址行為連結
    return description.replace(fullAddressLine, addressLink);
  }

  return description;
}

/**
 * 建立優惠券項目元素
 * @param {string} venueId - 場館 ID
 * @param {Object|null} coupon - 優惠券資料
 * @param {boolean} isUsed - 是否已使用
 * @param {number} completedCount - 已完成的集章數量
 * @returns {HTMLElement} 優惠券項目元素
 */
function createCouponItem(venueId, coupon, isUsed, completedCount) {
  const item = document.createElement('div');
  const store = storeData[venueId];

  // 判斷是否已集滿5個章
  const hasEnoughStamps = completedCount >= 5;

  // 判斷狀態
  let status = 'unavailable';
  if (hasEnoughStamps && !isUsed) {
    status = 'available';
  } else if (isUsed) {
    status = 'used';
  }

  item.className = `coupon-item ${status}`;

  // 左側：場館圖片
  const imageContainer = document.createElement('div');
  imageContainer.className = 'coupon-image-container';

  if (store && store.image) {
    const img = document.createElement('img');
    img.className = 'coupon-image';
    img.src = store.image;
    img.alt = store.name;
    img.onerror = function() {
      this.style.display = 'none';
    };
    imageContainer.appendChild(img);
  }

  // 已使用標記（覆蓋在圖片上）
  if (isUsed) {
    const usedMark = document.createElement('div');
    usedMark.className = 'used-mark';
    usedMark.textContent = '已使用';
    imageContainer.appendChild(usedMark);
  }

  item.appendChild(imageContainer);

  // 右側：店家資訊
  const infoContainer = document.createElement('div');
  infoContainer.className = 'coupon-info-container';

  // 店家名稱
  const name = document.createElement('div');
  name.className = 'coupon-name';
  name.textContent = store ? store.name : venueId;
  infoContainer.appendChild(name);

  // 店家簡介（處理地址連結）
  const description = document.createElement('div');
  description.className = 'coupon-description';

  if (store && store.description) {
    // 將簡介轉換為 HTML，地址部分轉為 Google Maps 連結
    const descriptionHTML = formatDescriptionWithMapLink(store.description, store.address);
    description.innerHTML = descriptionHTML;
  }

  infoContainer.appendChild(description);

  // 按鈕容器（右下角）
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'coupon-button-container';

  const button = document.createElement('button');
  button.className = 'coupon-action-button';

  if (!hasEnoughStamps) {
    button.textContent = '集章未完成';
    button.classList.add('disabled');
  } else if (isUsed) {
    button.textContent = '已使用';
    button.classList.add('disabled');
  } else {
    button.textContent = '使用優惠券';
    button.classList.add('active');
  }

  button.addEventListener('click', (e) => {
    e.stopPropagation();
    handleCouponClick(venueId, coupon, isUsed, hasEnoughStamps);
  });

  buttonContainer.appendChild(button);
  infoContainer.appendChild(buttonContainer);

  item.appendChild(infoContainer);

  return item;
}

/**
 * 處理優惠券點擊事件
 * @param {string} venueId - 場館 ID
 * @param {Object|null} coupon - 優惠券資料
 * @param {boolean} isUsed - 是否已使用
 * @param {boolean} hasEnoughStamps - 是否集滿5個章
 */
function handleCouponClick(venueId, coupon, isUsed, hasEnoughStamps) {
  // 取得店家名稱
  const store = storeData[venueId];
  const storeName = store ? store.name : venueId;

  if (!hasEnoughStamps) {
    // 未集滿5個章 - 顯示提示
    showModal(
      '集章未完成',
      '您需要完成5個集章任務，才能使用優惠券。',
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
