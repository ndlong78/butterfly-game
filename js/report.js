import { CANVAS, GAME } from './config.js';
import { drawRoundRect } from './canvas-utils.js';
import { isMobileLayout } from './viewport.js';

const STORAGE_KEY = 'butterflygame_sessions';
const DAY_MS = 24 * 60 * 60 * 1000;

let _pdfBtnBounds = { x: 0, y: 0, w: 0, h: 0 };
let _menuBtnBounds = { x: 0, y: 0, w: 0, h: 0 };

function hit(bounds, x, y) {
  return x >= bounds.x && x <= bounds.x + bounds.w && y >= bounds.y && y <= bounds.y + bounds.h;
}

function formatDateISOToVN(dateISO) {
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) {
    return '--/--';
  }
  return d.toLocaleDateString('vi-VN');
}

function formatDateShort(dateISO) {
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) {
    return '--/--';
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

export function saveSession(data) {
  let sessions = getSessions(9999);
  sessions.unshift(data);
  if (sessions.length > GAME.MAX_SESSIONS) {
    sessions = sessions.slice(0, GAME.MAX_SESSIONS);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function getSessions(days = 30) {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const cutoff = Date.now() - days * DAY_MS;
    return parsed.filter((s) => new Date(s.date).getTime() > cutoff);
  } catch {
    return [];
  }
}

/** Vẽ 4 metric cards dạng 2 cột (mobile) hoặc 3 cột ngang (desktop). */
function drawMetrics(ctx, sessions30, WIDTH, mobile) {
  const totalSeconds = sessions30.reduce((s, x) => s + (Number(x.timeSeconds) || 0), 0);
  const totalStars = sessions30.reduce((s, x) => s + (Number(x.stars) || 0), 0);
  const eyeOk = sessions30.filter((x) => x.eyeCoverResult === 'covered').length;
  const eyePct = sessions30.length > 0 ? Math.round((eyeOk / sessions30.length) * 100) : 0;
  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMinutes = Math.floor((totalSeconds % 3600) / 60);

  const metrics = [
    { label: 'Tổng thời gian', value: `${totalHours}h ${totalMinutes}m`, color: '#2C3E50' },
    { label: 'Tổng sao', value: `⭐ ${totalStars}`, color: '#E67E22' },
    { label: 'Tuân thủ che mắt', value: `${eyePct}%`, color: eyePct >= 70 ? '#27AE60' : '#E74C3C' },
    { label: 'Số buổi (30 ngày)', value: String(sessions30.length), color: '#2980B9' },
  ];

  if (mobile) {
    // 2×2 grid — mỗi ô đủ rộng đọc thoải mái
    const colW = (WIDTH - 80 - 12) / 2;
    const rowH = 80;
    const startX = 60;
    const startY = 170;

    for (let i = 0; i < metrics.length; i += 1) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = startX + col * (colW + 12);
      const cy = startY + row * (rowH + 10);

      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      drawRoundRect(ctx, cx, cy, colW, rowH, 12);
      ctx.fill();

      ctx.strokeStyle = 'rgba(44,62,80,0.08)';
      ctx.lineWidth = 1;
      drawRoundRect(ctx, cx, cy, colW, rowH, 12);
      ctx.stroke();

      ctx.fillStyle = 'rgba(44,62,80,0.55)';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(metrics[i].label, cx + colW / 2, cy + 26);

      ctx.fillStyle = metrics[i].color;
      ctx.font = 'bold 30px Arial';
      ctx.fillText(metrics[i].value, cx + colW / 2, cy + 60);
    }
  } else {
    // 3 số ngang như cũ (desktop không thay đổi)
    ctx.font = 'bold 25px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#34495E';
    ctx.fillText(`Tổng thời gian: ${totalHours}h ${totalMinutes}m`, 80, 210);
    ctx.fillText(`Tổng sao: ⭐${totalStars}`, 480, 210);
    ctx.fillText(`Tuân thủ che mắt: ${eyePct}%`, 800, 210);
  }
}

/**
 * Vẽ biểu đồ cột 7 ngày.
 * Trên mobile dùng chartX/barW nhỏ hơn cho vừa.
 */
function drawBarChart(ctx, sessions30, WIDTH, chartTopY, mobile) {
  const labels = new Array(7);
  const starsByDay = new Array(7);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i += 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - (6 - i));
    labels[i] = formatDateShort(day.toISOString());
    starsByDay[i] = 0;
  }

  for (let i = 0; i < sessions30.length; i += 1) {
    const label = formatDateShort(sessions30[i].date);
    const idx = labels.indexOf(label);
    if (idx >= 0) {
      starsByDay[idx] += Number(sessions30[i].stars) || 0;
    }
  }

  // Mobile: cột hẹp hơn, khoảng cách nhỏ hơn
  const barW = mobile ? 48 : 55;
  const gap = mobile ? 20 : 36;
  const chartH = mobile ? 90 : 100;
  const totalBarZone = 7 * barW + 6 * gap;
  const chartX = WIDTH / 2 - totalBarZone / 2;
  const chartY = chartTopY + chartH;

  let maxStars = 1;
  for (let i = 0; i < starsByDay.length; i += 1) {
    if (starsByDay[i] > maxStars) {
      maxStars = starsByDay[i];
    }
  }

  ctx.strokeStyle = '#B0BEC5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(chartX - 20, chartY);
  ctx.lineTo(chartX + totalBarZone + 20, chartY);
  ctx.stroke();

  for (let i = 0; i < 7; i += 1) {
    const x = chartX + i * (barW + gap);
    const h = (starsByDay[i] / maxStars) * chartH;

    ctx.fillStyle = '#3498DB';
    if (h > 0) {
      drawRoundRect(ctx, x, chartY - h, barW, h, 8);
      ctx.fill();
    }

    ctx.fillStyle = '#2C3E50';
    ctx.textAlign = 'center';
    ctx.font = mobile ? '20px Arial' : '18px Arial';
    ctx.fillText(labels[i], x + barW / 2, chartY + (mobile ? 30 : 28));

    if (starsByDay[i] > 0) {
      ctx.fillStyle = '#E67E22';
      ctx.font = mobile ? 'bold 20px Arial' : 'bold 16px Arial';
      ctx.fillText(String(starsByDay[i]), x + barW / 2, chartY - h - 6);
    }
  }
}

/**
 * Vẽ bảng phiên chơi gần nhất (tối đa 5 phiên) — chỉ mobile.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object[]} sessions
 * @param {number} startY
 * @param {number} WIDTH
 */
function drawRecentSessionsTable(ctx, sessions, startY, WIDTH) {
  const recent = sessions.slice(0, 5);
  if (recent.length === 0) {
    return;
  }

  const tableX = 60;
  const tableW = WIDTH - 120;
  const rowH = 52;
  const headerH = 36;

  // Header
  ctx.fillStyle = '#2C3E50';
  drawRoundRect(ctx, tableX, startY, tableW, headerH, 10);
  ctx.fill();

  ctx.fillStyle = 'white';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Ngày', tableX + 16, startY + 24);
  ctx.textAlign = 'center';
  ctx.fillText('Level', tableX + tableW * 0.38, startY + 24);
  ctx.fillText('Sao', tableX + tableW * 0.57, startY + 24);
  ctx.fillText('T.gian', tableX + tableW * 0.75, startY + 24);
  ctx.fillText('Mắt', tableX + tableW * 0.92, startY + 24);

  for (let i = 0; i < recent.length; i += 1) {
    const s = recent[i];
    const ry = startY + headerH + i * rowH;
    const isEven = i % 2 === 0;

    ctx.fillStyle = isEven ? 'rgba(255,255,255,0.9)' : 'rgba(236,240,241,0.7)';
    ctx.fillRect(tableX, ry, tableW, rowH);

    ctx.strokeStyle = 'rgba(44,62,80,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tableX, ry + rowH);
    ctx.lineTo(tableX + tableW, ry + rowH);
    ctx.stroke();

    const midY = ry + rowH / 2 + 7;

    ctx.fillStyle = '#34495E';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(formatDateShort(s.date), tableX + 16, midY);

    ctx.textAlign = 'center';
    ctx.fillText(`L${s.level || 1}`, tableX + tableW * 0.38, midY);

    // Stars
    const starCount = Number(s.stars) || 0;
    let starStr = '';
    for (let k = 0; k < starCount; k += 1) {
      starStr += '★';
    }
    ctx.fillStyle = '#F1C40F';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(starStr || '—', tableX + tableW * 0.57, midY);

    ctx.fillStyle = '#34495E';
    ctx.font = '20px Arial';
    ctx.fillText(`${s.timeSeconds || 0}s`, tableX + tableW * 0.75, midY);

    const eyeOk = s.eyeCoverResult === 'covered';
    ctx.fillStyle = eyeOk ? '#27AE60' : '#95A5A6';
    ctx.fillText(eyeOk ? '✓' : '—', tableX + tableW * 0.92, midY);
  }

  // Rounded border quanh toàn bảng
  const totalH = headerH + recent.length * rowH;
  ctx.strokeStyle = 'rgba(44,62,80,0.12)';
  ctx.lineWidth = 1.5;
  drawRoundRect(ctx, tableX, startY, tableW, totalH, 10);
  ctx.stroke();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} childName
 */
export function drawReportScreen(ctx, childName = '', layout = null) {
  const WIDTH = layout ? layout.w : CANVAS.WIDTH;
  const HEIGHT = layout ? layout.h : CANVAS.HEIGHT;
  const mobile = layout ? layout.isPhone : isMobileLayout();
  const sessions30 = getSessions(30);

  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0, '#FFFFFF');
  bg.addColorStop(1, '#EAF4FF');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (mobile) {
    // Header bar tối — tên + tuổi bé nổi bật
    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(0, 0, WIDTH, 88);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('BÁO CÁO TIẾN BỘ', WIDTH / 2, 46);

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '24px Arial';
    ctx.fillText(`Bé: ${childName || 'Chưa nhập'}`, WIDTH / 2, 76);

    // Metrics 2×2
    drawMetrics(ctx, sessions30, WIDTH, true);

    // Chart title
    ctx.fillStyle = '#2C3E50';
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Sao theo ngày (7 ngày gần nhất)', 60, 368);

    drawBarChart(ctx, sessions30, WIDTH, 372, true);

    // Recent sessions table
    ctx.fillStyle = '#2C3E50';
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Phiên gần nhất', 60, 500);

    drawRecentSessionsTable(ctx, sessions30, 510, WIDTH);

  } else {
    // Desktop layout — không thay đổi
    ctx.fillStyle = '#2C3E50';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('📊 BÁO CÁO TIẾN BỘ', WIDTH / 2, 90);

    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2 - 250, 110);
    ctx.lineTo(WIDTH / 2 + 250, 110);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#34495E';
    ctx.font = '24px Arial';
    ctx.fillText(`Bé: ${childName || 'Chưa nhập'}`, 80, 155);

    drawMetrics(ctx, sessions30, WIDTH, false);

    ctx.fillStyle = '#2C3E50';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Sao theo ngày (7 ngày gần nhất)', 80, 290);

    drawBarChart(ctx, sessions30, WIDTH, 295, false);
  }

  // Buttons — chung cho cả hai layout
  const btnY = mobile ? HEIGHT - 82 : HEIGHT - 90;
  const pdfBtn = mobile
    ? { x: 60, y: btnY, w: WIDTH / 2 - 70, h: 56 }
    : { x: WIDTH / 2 - 220, y: btnY, w: 180, h: 56 };
  const menuBtn = mobile
    ? { x: WIDTH / 2 + 10, y: btnY, w: WIDTH / 2 - 70, h: 56 }
    : { x: WIDTH / 2 + 40, y: btnY, w: 180, h: 56 };
  _pdfBtnBounds = pdfBtn;
  _menuBtnBounds = menuBtn;

  ctx.fillStyle = '#2E86DE';
  drawRoundRect(ctx, pdfBtn.x, pdfBtn.y, pdfBtn.w, pdfBtn.h, 28);
  ctx.fill();

  ctx.fillStyle = '#95A5A6';
  drawRoundRect(ctx, menuBtn.x, menuBtn.y, menuBtn.w, menuBtn.h, 28);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 26px Arial';
  ctx.fillText('Xuất PDF', pdfBtn.x + pdfBtn.w / 2, pdfBtn.y + pdfBtn.h / 2);
  ctx.fillText('Về menu', menuBtn.x + menuBtn.w / 2, menuBtn.y + menuBtn.h / 2);
  ctx.textBaseline = 'alphabetic';
}

export function exportPDF(childName, childAge) {
  if (!window.jspdf || typeof window.jspdf.jsPDF !== 'function') {
    alert('Thư viện PDF chưa sẵn sàng. Vui lòng thử lại sau vài giây.');
    return false;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  if (typeof doc.autoTable !== 'function') {
    alert('Thiếu AutoTable, chưa thể xuất PDF lúc này.');
    return false;
  }

  const sessions = getSessions(30);
  const dateText = new Date().toLocaleDateString('vi-VN');

  doc.setTextColor('#2C3E50');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('BÁO CÁO TIẾN BỘ TẬP NHƯỢC THỊ', 105, 20, { align: 'center' });

  doc.setDrawColor('#2C3E50');
  doc.line(20, 26, 190, 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(`Họ tên: ${childName || 'Chưa nhập'}`, 20, 36);
  doc.text(`Tuổi: ${childAge || 'Chưa nhập'}`, 20, 44);
  doc.text(`Ngày xuất: ${dateText}`, 20, 52);

  const body = sessions.map((s) => [
    formatDateISOToVN(s.date),
    String(s.level || ''),
    String(s.stars || 0),
    String(s.timeSeconds || 0),
    `${s.trackingPercent || 0}%`,
    String(s.eyeCoverResult || 'không rõ'),
  ]);

  doc.autoTable({
    head: [['Ngày', 'Level', 'Sao', 'Thời gian (s)', 'Theo dõi %', 'Che mắt']],
    body,
    startY: 58,
    styles: { fontSize: 10 },
  });

  doc.addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('GHI CHÚ BÁC SĨ', 20, 20);

  doc.setDrawColor('#B0BEC5');
  for (let i = 0; i < 10; i += 1) {
    const y = 35 + i * 20;
    doc.line(20, y, 190, y);
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor('#7F8C8D');
    doc.text(`Bướm Bay Mắt Vui | ${dateText}`, 105, 290, { align: 'center' });
  }

  doc.save('bao-cao-tien-bo.pdf');
  return true;
}

export function handleReportClick(x, y) {
  if (hit(_pdfBtnBounds, x, y)) {
    return 'pdf';
  }
  if (hit(_menuBtnBounds, x, y)) {
    return 'menu';
  }
  return null;
}
