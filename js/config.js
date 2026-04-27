export const CANVAS = {
  WIDTH: window.innerWidth || 1280,
  HEIGHT: window.innerHeight || 720,
  DESIGN_WIDTH: 1280,
  DESIGN_HEIGHT: 720,
  TARGET_FPS: 60,
};

export const GAME = {
  CATCH_RADIUS: 60,
  CATCH_RADIUS_MOBILE: 88,
  CATCH_DURATION: 1500,
  EYE_CHECK_SECONDS: 5,
  BRIGHTNESS_THRESHOLD: 40,
  MAX_SESSIONS: 500,
};

export const LEVELS = [
  { butterflies: 1, speedMultiplier: 1.5, segmentMs: 4000 },
  { butterflies: 2, speedMultiplier: 2.2, segmentMs: 3500 },
  { butterflies: 3, speedMultiplier: 3.0, segmentMs: 3000 },
  { butterflies: 5, speedMultiplier: 3.8, segmentMs: 2500 },
];

export const COLORS = {
  sky: '#87CEEB',
  skyLight: '#BFEFFF',
  grass: '#7ED957',
  cloud: '#FFFFFF',
  teddy: '#C68642',
  rabbit: '#F7D9E3',
  rainbow: ['#FF595E', '#FF924C', '#FFCA3A', '#8AC926', '#52B788', '#1982C4', '#6A4C93'],
  butterflies: ['#FFD6E8', '#CDEBFF', '#FFF1B8', '#D6F5D6', '#E9D5FF', '#FFC9A9'],
};

export const VOICE_TEXTS = {
  WELCOME: 'Chào con yêu, mình cùng chơi Bướm Bay Mắt Vui nhé!',
  EYE_CHECK_PROMPT: 'Con dùng tay che một mắt và nhìn vào màn hình nào.',
  EYE_COVERED_OK: 'Giỏi lắm, con che mắt đúng rồi, mình bắt đầu thôi!',
  EYE_NOT_COVERED: 'Con thử che kín một mắt hơn một chút nhé, cô chờ con.',
  CATCH_PRAISE: 'Tuyệt vời, con bắt bướm rất khéo!',
  LEVEL_1_STAR: 'Con đã nhận được một ngôi sao lấp lánh rồi!',
  LEVEL_2_STAR: 'Hai ngôi sao rồi, con tiến bộ nhanh quá!',
  LEVEL_3_STAR: 'Ba ngôi sao! Con thật xuất sắc!',
  LEVEL_START: 'Sẵn sàng chưa? Chúng ta bắt đầu màn mới nhé!',
  REPORT_OPEN: 'Ba mẹ ơi, mình mở báo cáo kết quả của bé nhé!',
};
