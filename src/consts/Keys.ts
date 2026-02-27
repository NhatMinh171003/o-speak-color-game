// src/consts/Keys.ts

// 1. Tên các Màn chơi (Scene)
export enum SceneKeys {
    Preload = 'PreloadScene',
    SpeakScene = 'SpeakScene',
    Scene2 = 'Scene2',
    EndGame = 'EndGameScene'
}

// 2. Tên các Hình ảnh (Texture)
export enum TextureKeys {
    // --- UI Dùng Chung ---
    BtnExit = 'btn_exit',
    BtnReset = 'btn_reset',
    BtnEraser = 'btn_eraser',
    HandHint = 'hand_hint',
    BgPopup = 'bg_popup',
    S1_Board = 'board_white',

    // --- SpeakScene (Đọc thơ) ---
    Speak_Banner = 'speak_banner',
    Speak_Excerpt = 'speak_excerpt',
    Speak_Author = 'speak_author',
    Speak_Title = 'speak_title',
    Speak_Content = 'speak_content',
    Speak_Illustration = 'speak_illustration',
    Speak_Speaker = 'speak_speaker',
    Speak_Micro = 'speak_micro',
    Speak_SmileD = 'speak_smile_d',
    Speak_AniSpeak1 = 'ani_speak1',
    Speak_AniSpeak2 = 'ani_speak2',
    Speak_AniSpeak3 = 'ani_speak3',

    // --- Scene 2 (Tô Màu) ---
    S2_Banner = 'banner_s2',
    S2_TextBanner = 'text_banner_s2',
    S2_Board = 'board_s2',

    // Các bộ phận tô màu
    S2_O_Outline = 'o_outline',
    S2_O_Body = 'o_body',

    S2_Balloon_Outline = 'balloon_line',
    S2_Balloon_1 = 'balloon_1',
    S2_Balloon_2 = 'balloon_2',
    S2_Balloon_3 = 'balloon_3',
    S2_Balloon_4 = 'balloon_4',
    S2_TxtBalloon = 'txt_balloon',

    // Các nút màu
    BtnRed = 'btn_red',
    BtnYellow = 'btn_yellow',
    BtnGreen = 'btn_green',
    BtnBlue = 'btn_blue',
    BtnPurple = 'btn_purple',
    BtnCream = 'btn_cream',
    BtnBlack = 'btn_black',

    // --- Score Images ---
    Score_4 = 'score_4',
    Score_5 = 'score_5',
    Score_6 = 'score_6',
    Score_7 = 'score_7',
    Score_8 = 'score_8',
    Score_9 = 'score_9',
    Score_10 = 'score_10',

    // --- End Game ---
    End_Icon = 'icon_end',
    End_BannerCongrat = 'banner_congrat'
}

// 3. Tên Âm thanh (Audio)
export enum AudioKeys {
    BgmNen = 'bgm-nen'
}

// 4. Tên File Data (JSON)
export enum DataKeys {
    LevelS2Config = 'level_config'
}