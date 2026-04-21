import { CANVAS, GAME } from './config.js';
import { drawRoundRect } from './canvas-utils.js';

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

export function drawReportScreen(ctx, childName = '') {
  const { WIDTH, HEIGHT } = CANVAS;
  const sessions30 = getSessions(30);

  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0, '#FFFFFF');
  bg.addColorStop(1, '#EAF4FF');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

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

  let totalSeconds = 0;
  let totalStars = 0;
  let eyeOk = 0;
  for (let i = 0; i < sessions30.length; i += 1) {
    const s = sessions30[i];
    totalSeconds += Number(s.timeSeconds) || 0;
    totalStars += Number(s.stars) || 0;
    if (s.eyeCoverResult === 'covered') {
      eyeOk += 1;
    }
  }

  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
  const eyePct = sessions30.length > 0 ? Math.round((eyeOk / sessions30.length) * 100) : 0;

  ctx.font = 'bold 25px Arial';
  ctx.fillText(`Tổng thời gian: ${totalHours}h ${totalMinutes}m`, 80, 210);
  ctx.fillText(`Tổng sao: ⭐${totalStars}`, 480, 210);
  ctx.fillText(`Tuân thủ che mắt: ${eyePct}%`, 800, 210);

  ctx.fillStyle = '#2C3E50';
  ctx.font = 'bold 30px Arial';
  ctx.fillText('Sao theo ngày (7 ngày gần nhất)', 80, 290);

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

  const chartX = 110;
  const chartY = 450;
  const chartH = 100;
  const barW = 55;
  const gap = 36;
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
  ctx.lineTo(chartX + 7 * (barW + gap), chartY);
  ctx.stroke();

  for (let i = 0; i < 7; i += 1) {
    const x = chartX + i * (barW + gap);
    const h = (starsByDay[i] / maxStars) * chartH;

    ctx.fillStyle = '#3498DB';
    drawRoundRect(ctx, x, chartY - h, barW, h, 8);
    ctx.fill();

    ctx.fillStyle = '#2C3E50';
    ctx.textAlign = 'center';
    ctx.font = '18px Arial';
    ctx.fillText(labels[i], x + barW / 2, chartY + 28);
  }

  const pdfBtn = { x: WIDTH / 2 - 220, y: HEIGHT - 90, w: 180, h: 56 };
  const menuBtn = { x: WIDTH / 2 + 40, y: HEIGHT - 90, w: 180, h: 56 };
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
