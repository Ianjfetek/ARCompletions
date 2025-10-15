/**
 * 集章頁面邏輯
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

  grid.innerHTML = '';

  for (let i = 1; i <= TOTAL_VENUES; i++) {
    const venueId = `venue${String(i).padStart(2, '0')}`;
    const isCompleted = completedVenues.includes(venueId);

    const stampItem = createStampItem(venueId, isCompleted);
    grid.appendChild(stampItem);
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

  // 完成標記（覆蓋在圖片上）
  if (isCompleted) {
    const checkMark = document.createElement('div');
    checkMark.className = 'check-mark';
    checkMark.textContent = '✓';
    item.appendChild(checkMark);
  }

  // 店家名稱
  const name = document.createElement('div');
  name.className = 'venue-name';
  name.textContent = store ? store.name : venueId;
  item.appendChild(name);

  return item;
}

/**
 * 更新進度顯示
 */
function updateProgress() {
  const progressElement = document.getElementById('progress');
  const doneCount = venueData.doneCount || 0;
  const totalRequired = venueData.totalRequired || TOTAL_VENUES;

  progressElement.textContent = `${doneCount}/${totalRequired}`;
}

// 頁面載入時初始化
document.addEventListener('DOMContentLoaded', init);
