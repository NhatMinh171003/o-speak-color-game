/**
 * Chứa toàn bộ hằng số cấu hình của Game.
 * Tập trung tại một chỗ để dễ dàng cân chỉnh (Balancing) mà không cần sửa Logic.
 */
export const GameConstants = {
    // =========================================
    // CẤU HÌNH CHUNG (SYSTEM)
    // =========================================
    IDLE: {
        /** Thời gian chờ trước khi hiện gợi ý (ms). 10000 = 10 giây */
        THRESHOLD: 10000,
        /** Thời gian hiệu ứng hiện bàn tay (ms) */
        FADE_IN: 800,
        /** Thời gian hiệu ứng ấn xuống (Scale nhỏ lại) (ms) */
        SCALE: 300,
        /** Thời gian hiệu ứng ẩn bàn tay đi (ms) */
        FADE_OUT: 500,
        /** Bàn tay lệch trục X so với vật thể (px) */
        OFFSET_X: 50,
        /** Bàn tay lệch trục Y so với vật thể (px) */
        OFFSET_Y: 50,
    },

    // =========================================
    // BACKEND SESSION CONFIG
    // =========================================
    BACKEND_SESSION: {
        GAME_ID: 'speak-matching-o-game',
        LESSON_ID: 'lesson-o-3-4',
        GAME_VERSION: '1.0.0',
        AGE_LEVEL: '3-4',
        DEFAULT_CHILD_ID: 'cao_nhat_minh',
    },

    // =========================================
    // GHI ÂM GIỌNG NÓI
    // =========================================
    VOICE_RECORDING: {
        MAX_DURATION: 30000,
        SILENCE_TIMEOUT: 3000,
        CALIBRATION_DURATION: 2000,
        NOISE_MARGIN: 2,
        KEYWORDS: 'Ò ó o o o Chú gà trống choàng tỉnh Vội gáy rõ thật to Gọi bé đi đến lớp',
        API_URL: 'https://voice-eval-api-h7j3ksnhva-as.a.run.app/api/v1/voice/eval/5-6',
        API_URL_DEV: 'https://voice-eval-api-h7j3ksnhva-as.a.run.app/api/v1/voice/eval/5-6',
        TEST_MODE: false,
        MIN_SCORE: 4,
        AVERAGE_SCORE: 7,
        GOOD_SCORE: 9,
        PASS_THRESHOLD: 6,
        RETRY_DELAY: 2000,
    },

    // =========================================
    // SPEAK SCENE: Nghe và đọc lại đoạn văn
    // =========================================
    SPEAK_SCENE: {
        BANNER: { X: 0.5, Y: 0.01, SCALE: 0.65 },
        // BANNER_TEXT: { X: 0.5, Y: 0.08, SCALE: 0.7 },
        BOARD: { X: 0.5, Y: 0.54, SCALE: 0.7, ALPHA: 1.0 },
        TITLE: { X: 0.27, Y: 0.47, SCALE: 0.7 },
        EXCERPT: { X: 0.245, Y: 0.51, SCALE: 0.70 },
        AUTHOR: { X: 0.40, Y: 0.80, SCALE: 0.6 },
        SMILE_D: { X: 0.28, Y: 0.27, SCALE: 0.6 },
        CONTENT: { X: 0.35, Y: 0.65, SCALE: 0.70 },
        ILLUSTRATION: { X: 0.661, Y: 0.391, SCALE: 0.55 },
        SPEAKER: { X: 0.78, Y: 0.88, SCALE: 0.8 },
        MICRO: { X: 0.78, Y: 0.75, SCALE: 0.8 },
        ANIM: { SHAKE_DURATION: 500, FLOAT_DURATION: 1500, FLOAT_DISTANCE: 8 },
        TIMING: { DELAY_SHOW_MIC: 500, RECORDING_DURATION: 3000, DELAY_NEXT_SCENE: 3500 },
        READING_FINGER: {
            ENABLED: true,
            SCALE: 0.5,
            SPEED: 150,
            LINE_DELAY: 1000,
            TRANSITION_DURATION: 300,
            LINES: [
                { startX: 0.2, endX: 0.36, y: 0.58, duration: 1000 },
                { startX: 0.2, endX: 0.48, y: 0.63, duration: 1500 },
                { startX: 0.2, endX: 0.4, y: 0.69, duration: 1200 },
                { startX: 0.2, endX: 0.4, y: 0.74, duration: 1200 },
            ]
        },
        SCORE_BOARD: {
            X: 0.5, Y: 0.5,
            SCALE_LOADING: 0.35, SCALE_SCORE: 0.35,
            MASCOT_OFFSET_Y: 0, MASCOT_SCALE: 0.70,
            TEXT_OFFSET_Y: 120,
            SCORE_IMG_OFFSET_Y: -8, SCORE_IMG_SCALE: 0.25,
        },
        SPEAK_ANIMATION: {
            X: 0.805, Y: 0.88, SCALE: 0.8, FRAME_DURATION: 700,
            FRAMES: ['ani_speak1', 'ani_speak2', 'ani_speak3']
        },
        LINE_MASKS: {
            ENABLED: true, BOX_HEIGHT: 0.053,
            BOX_COLOR: 0xFFFFFF, BOX_ALPHA: 1,
            PADDING_X: 0.017, OFFSET_Y_UP: 0.01,
        },
        LINE_READING: {
            TOTAL_LINES: 4,
            MAX_RECORD_TIME_PER_LINE: 5000,
            KEYWORDS_PER_LINE: [
                'Ò ó o o o',
                'Chú gà trống choàng tỉnh',
                'Vội gáy rõ thật to',
                'Gọi bé đi đến lớp',
            ],
            TEST_AUDIO_FILES: [
                'assets/test_mode/NoiDung/line1.wav',
                'assets/test_mode/NoiDung/line2.wav',
                'assets/test_mode/NoiDung/line3.wav',
                'assets/test_mode/NoiDung/line4.wav',
            ],
            LINE_PROMPTS: [
                'intro-voice',
                'begin-line2',
                'begin-line3',
                'begin-line4',
            ],
            WAIT_GRADING: 'wait-grading',
        }
    },



    // =========================================
    // SCENE 2: TÔ MÀU
    // =========================================
    SCENE2: {
        UI: {
            BANNER_Y: 0.01,
            BOARD_OFFSET: 0.03,
            /** Vị trí Y của bảng màu (Tỉ lệ màn hình) */
            PALETTE_Y: 0.89,
            /** Khoảng cách giữa các nút màu (Tỉ lệ màn hình) */
            PALETTE_SPACING: 0.07,

            // Tọa độ đích cho bàn tay hướng dẫn Intro
            HAND_INTRO_END_X: 0.65,
            HAND_INTRO_END_Y: 0.48,
        },
        TIMING: {
            /** Chờ bao lâu mới bắt đầu Intro (ms) */
            INTRO_DELAY: 1000,
            /** Delay restart intro khi xoay màn hình (ms) */
            RESTART_INTRO: 200,
            /** Thắng xong chờ bao lâu chuyển màn EndGame (ms) */
            WIN_DELAY: 2500,
            /** Thời gian nhấp nháy khi tô xong 1 phần (ms) */
            AUTO_FILL: 100,
        },
        INTRO_HAND: {
            MOVE: 600,
            TAP: 200,
            DRAG: 800,
            RUB: 400,
        }
    },

    // =========================================
    // CẤU HÌNH VẼ (PAINT MANAGER)
    // =========================================
    PAINT: {
        BRUSH_SIZE: 100,
        /** Tỉ lệ tô màu để tính là hoàn thành (0.90 = 90%) */
        WIN_PERCENT: 0.90,
        DEFAULT_COLOR: 0xff0000
    },

    // =========================================
    // END GAME SCENE
    // =========================================
    ENDGAME: {
        UI: {
            /** Banner cách tâm giữa lên trên (Tỉ lệ) */
            BANNER_OFFSET: 0.12,
            /** Icon cách tâm giữa lên trên (px) */
            ICON_OFFSET: 150,
            /** Nút bấm cách tâm giữa xuống dưới (Tỉ lệ) */
            BTN_OFFSET: 0.2,
            /** Khoảng cách giữa 2 nút (px) */
            BTN_SPACING: 250,
        },
        CONFETTI: {
            DELAY: 100,
            MIN_DUR: 3000,
            MAX_DUR: 5000,
        },
        ANIM: {
            ICON_FLOAT: 800,
            ICON_SHAKE: 600,
            FIREWORKS_DELAY: 2000,
        }
    },

    // =========================================
    // MASCOT ANIMATIONS (Sprite Sheet)
    // =========================================
    MASCOT_ANIMATIONS: {
        X: 0.63,
        Y: 0.8,
        SCALE: 0.7,
        DEPTH: 60,

        RECORDING: {
            SPRITE_SHEET: {
                KEY: 'mascot_recording',
                PATH: 'assets/animation/spritesheet_trang_thai_1.png',
                FRAME_WIDTH: 345,
                FRAME_HEIGHT: 310,
                START_FRAME: 0,
                END_FRAME: 6,
            },
            FRAME_DURATION: 200,
            REPEAT: -1,
        },

        PROCESSING: {
            SPRITE_SHEET: {
                KEY: 'mascot_processing',
                PATH: 'assets/animation/trang_thai_2.png',
                FRAME_WIDTH: 300,
                FRAME_HEIGHT: 424,
                START_FRAME: 0,
                END_FRAME: 7,
            },
            FRAME_DURATION: 200,
            REPEAT: -1,
        },

        RESULT_HAPPY: {
            SPRITE_SHEET: {
                KEY: 'mascot_happy',
                PATH: 'assets/animation/trang_thai_3_-_vui_ve.png',
                FRAME_WIDTH: 300,
                FRAME_HEIGHT: 308,
                START_FRAME: 0,
                END_FRAME: 5,
            },
            FRAME_DURATION: 150,
            REPEAT: 2,
        },

        RESULT_SAD: {
            SPRITE_SHEET: {
                KEY: 'mascot_sad',
                PATH: 'assets/animation/trang_thai_3_-_that_vong.png',
                FRAME_WIDTH: 300,
                FRAME_HEIGHT: 310,
                START_FRAME: 0,
                END_FRAME: 5,
            },
            FRAME_DURATION: 180,
            REPEAT: 2,
        },

        IDLE: {
            SPRITE_SHEET: {
                KEY: 'mascot_idle',
                PATH: 'assets/animation/trang_thai_dung_yen.png',
                FRAME_WIDTH: 300,
                FRAME_HEIGHT: 340,
                START_FRAME: 0,
                END_FRAME: 4,
            },
            FRAME_DURATION: 200,
            REPEAT: -1,
        },
    }
} as const; // <--- QUAN TRỌNG: Biến toàn bộ object thành Read-only literals