/**
 * 集章頁面邏輯
 */

// 全局變數
let venueData = null;
let stampData = null;
let userId = null;

/**
 * 初始化頁面
 */
async function init() {
  // 取得 userId（如果沒有則使用預設值）
  userId = Utils.getUrlParam('userId') || 'guest';

  // 顯示 Loading
  Utils.showLoading();

  // 載入集章資料
  stampData = await Utils.loadStampData();

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
      requiredVenues: Object.keys(stampData),
      doneCount: 0,
      totalRequired: Object.keys(stampData).length
    };
  } else {
    venueData = result.data;
  }

  // 渲染頁面
  renderStamps();
  updateProgress();

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
 * 渲染集章網格
 */
function renderStamps() {
  const grid = document.getElementById('stampGrid');
  const completedVenues = venueData.completedVenues || [];
  const totalVenues = Object.keys(stampData).length;
  const isAllCompleted = completedVenues.length === totalVenues;

  grid.innerHTML = '';

  // 動態渲染所有場館
  Object.keys(stampData).forEach(venueId => {
    const isCompleted = completedVenues.includes(venueId);
    const stampItem = createStampItem(venueId, isCompleted);
    grid.appendChild(stampItem);
  });

  // 如果所有集章都完成，添加優惠券連結
  if (isAllCompleted) {
    const couponItem = createCouponLink();
    grid.appendChild(couponItem);
  }
}

/**
 * 建立集章項目元素
 * @param {string} venueId - 場館 ID
 * @param {boolean} isCompleted - 是否完成
 * @returns {HTMLElement} 集章項目元素
 */
function createStampItem(venueId, isCompleted) {
  const item = document.createElement('div');
  item.className = `stamp-item${isCompleted ? ' completed' : ''}`;

  const venue = stampData[venueId];

  // 場館圖片
  if (venue && venue.image) {
    const img = document.createElement('img');
    img.className = 'venue-image';
    img.src = venue.image;
    img.alt = venue.name;
    img.onerror = function() {
      this.style.display = 'none';
    };
    item.appendChild(img);
  }

  // 完成標記（覆蓋在圖片上）
  if (isCompleted) {
    const checkMark = document.createElement('div');
    checkMark.className = 'check-mark';
    checkMark.textContent = '✓';
    item.appendChild(checkMark);
  } else {
    // 未完成的章節：可點擊導向 URL
    item.classList.add('clickable');
    item.addEventListener('click', () => handleStampClick(venueId, venue));
  }

  // 店家名稱（按 _ 分割成兩行）
  const name = document.createElement('div');
  name.className = 'venue-name';

  if (venue) {
    const parts = venue.name.split('_');
    if (parts.length > 1) {
      // 第一行：品牌名稱
      const line1 = document.createElement('div');
      line1.className = 'venue-name-line';
      line1.textContent = parts[0];
      name.appendChild(line1);

      // 第二行：商品名稱
      const line2 = document.createElement('div');
      line2.className = 'venue-name-line';
      line2.textContent = parts.slice(1).join('_');
      name.appendChild(line2);
    } else {
      name.textContent = venue.name;
    }
  } else {
    name.textContent = venueId;
  }

  item.appendChild(name);

  return item;
}

/**
 * 建立優惠券連結項目（當所有集章完成時顯示）
 * @returns {HTMLElement} 優惠券連結項目元素
 */
function createCouponLink() {
  const item = document.createElement('div');
  item.className = 'stamp-item coupon-link';

  // 使用第一張圖片作為背景（若有的話）
  const firstVenueId = Object.keys(stampData)[0];
  const firstVenue = stampData[firstVenueId];

  if (firstVenue && firstVenue.image) {
    const img = document.createElement('img');
    img.className = 'venue-image';
    img.src = 'assets/images/01.jpg';
    img.alt = '優惠券';
    img.onerror = function() {
      this.style.display = 'none';
    };
    item.appendChild(img);
  }

  // 優惠券標籤
  const label = document.createElement('div');
  label.className = 'venue-name';
  label.textContent = '優惠券';
  item.appendChild(label);

  // 點擊事件：導向優惠券頁面，帶上 userId
  item.addEventListener('click', () => {
    if (userId && userId !== 'guest') {
      window.location.href = `coupon.html?userId=${userId}`;
    } else {
      window.location.href = 'coupon.html';
    }
  });

  return item;
}

/**
 * 處理集章項目點擊事件
 * @param {string} venueId - 場館 ID
 * @param {Object} venue - 場館資料
 */
function handleStampClick(venueId, venue) {
  if (!venue || !venue.url) {
    console.warn(`場館 ${venueId} 沒有設定 URL`);
    return;
  }

  // 建立帶參數的 URL
  const url = new URL(venue.url);
  url.searchParams.set('userId', userId);
  url.searchParams.set('venuesid', venueId);

  // 另開新視窗
  window.open(url.toString(), '_blank');
}

/**
 * 更新進度顯示
 */
function updateProgress() {
  const progressElement = document.getElementById('progress');
  const doneCount = venueData.doneCount || venueData.completedVenues.length || 0;
  const totalRequired = venueData.totalRequired || Object.keys(stampData).length;

  progressElement.textContent = `${doneCount}/${5}`;
}

// 頁面載入時初始化
document.addEventListener('DOMContentLoaded', init);
