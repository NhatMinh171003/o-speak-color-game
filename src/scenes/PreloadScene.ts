// src/scenes/PreloadScene.ts
import Phaser from 'phaser';
import { SceneKeys, TextureKeys, AudioKeys, DataKeys } from '../consts/Keys';
import { GameConstants } from '../consts/GameConstants';
import { AnimationFactory } from '../utils/AnimationFactory';
import AudioManager from '../audio/AudioManager';

export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super(SceneKeys.Preload);
    }

    preload() {
        // ========================================
        // 1. UI Chung
        // ========================================
        this.load.image(TextureKeys.BtnExit, 'assets/images/ui/btn_exit.png');
        this.load.image(TextureKeys.BtnReset, 'assets/images/ui/btn_reset.png');
        this.load.image(TextureKeys.BtnEraser, 'assets/images/ui/btn_eraser.png');
        this.load.image(TextureKeys.HandHint, 'assets/images/ui/hand.png');
        this.load.image(TextureKeys.BgPopup, 'assets/images/bg/board_pop_up.png');
        this.load.image(TextureKeys.S1_Board, 'assets/images/bg/board_white.png');
        this.load.image

        // ========================================
        // 2. SpeakScene Assets
        // ========================================
        this.load.image(TextureKeys.Speak_Banner, 'assets/images/SpeakScene/banner.png');
        this.load.image(TextureKeys.Speak_Title, 'assets/images/SpeakScene/title.png');
        this.load.image(TextureKeys.Speak_Content, 'assets/images/SpeakScene/content.png');
        this.load.image(TextureKeys.Speak_Illustration, 'assets/images/SpeakScene/speak_illustration.png');
        this.load.image(TextureKeys.Speak_Speaker, 'assets/images/SpeakScene/speaker.png');
        this.load.image(TextureKeys.Speak_Micro, 'assets/images/SpeakScene/micro.png');
        this.load.image(TextureKeys.Speak_SmileD, 'assets/images/SpeakScene/smile_wth_l.png');
        this.load.image(TextureKeys.Speak_AniSpeak1, 'assets/images/SpeakScene/ani_speak1.png');
        this.load.image(TextureKeys.Speak_AniSpeak2, 'assets/images/SpeakScene/ani_speak2.png');
        this.load.image(TextureKeys.Speak_AniSpeak3, 'assets/images/SpeakScene/ani_speak3.png');
        this.load.image(TextureKeys.Speak_Excerpt, 'assets/images/SpeakScene/excerpt.png');
        this.load.image(TextureKeys.Speak_Author, 'assets/images/SpeakScene/author.png');

        // ========================================
        // 3. Mascot Animations (Sprite Sheets)
        // ========================================
        const MASCOT = GameConstants.MASCOT_ANIMATIONS;
        AnimationFactory.preload(this, { ...MASCOT, ...MASCOT.RECORDING });
        AnimationFactory.preload(this, { ...MASCOT, ...MASCOT.PROCESSING });
        AnimationFactory.preload(this, { ...MASCOT, ...MASCOT.RESULT_HAPPY });
        AnimationFactory.preload(this, { ...MASCOT, ...MASCOT.RESULT_SAD });
        AnimationFactory.preload(this, { ...MASCOT, ...MASCOT.IDLE });

        // ========================================
        // 4. Scene 2 Assets (Tô màu bóng bay)
        // ========================================
        this.load.image(TextureKeys.S2_Banner, 'assets/images/S2/banner.png');
        this.load.image(TextureKeys.S2_TextBanner, 'assets/images/S2/text_banner.png');
        this.load.image(TextureKeys.S2_Board, 'assets/images/bg/board_scene_2.png');

        this.load.image(TextureKeys.S2_O_Outline, 'assets/images/S2/o_outline.png');

        this.load.image(TextureKeys.S2_Balloon_Outline, 'assets/images/S2/balloon_line.png');
        this.load.image(TextureKeys.S2_Balloon_1, 'assets/images/S2/balloon_1.png');
        this.load.image(TextureKeys.S2_Balloon_2, 'assets/images/S2/balloon_2.png');
        this.load.image(TextureKeys.S2_Balloon_3, 'assets/images/S2/balloon_3.png');
        this.load.image(TextureKeys.S2_Balloon_4, 'assets/images/S2/balloon_4.png');
        this.load.image(TextureKeys.S2_TxtBalloon, 'assets/images/S2/txt_balloon.png');

        this.load.image(TextureKeys.BtnRed, 'assets/images/color/red.png');
        this.load.image(TextureKeys.BtnYellow, 'assets/images/color/yellow.png');
        this.load.image(TextureKeys.BtnGreen, 'assets/images/color/green.png');
        this.load.image(TextureKeys.BtnBlue, 'assets/images/color/blue.png');
        this.load.image(TextureKeys.BtnPurple, 'assets/images/color/purple.png');
        this.load.image(TextureKeys.BtnCream, 'assets/images/color/cream.png');
        this.load.image(TextureKeys.BtnBlack, 'assets/images/color/black.png');

        this.load.json(DataKeys.LevelS2Config, 'assets/data/level_s2_config.json');

        // ========================================
        // 5. End Game Assets
        // ========================================
        this.load.image(TextureKeys.End_Icon, 'assets/images/ui/icon_end.png');
        this.load.image(TextureKeys.End_BannerCongrat, 'assets/images/bg/banner_congrat.png');

        // ========================================
        // 5b. Score Images
        // ========================================
        this.load.image(TextureKeys.Score_4, 'assets/images/score/4.png');
        this.load.image(TextureKeys.Score_5, 'assets/images/score/5.png');
        this.load.image(TextureKeys.Score_6, 'assets/images/score/6.png');
        this.load.image(TextureKeys.Score_7, 'assets/images/score/7.png');
        this.load.image(TextureKeys.Score_8, 'assets/images/score/8.png');
        this.load.image(TextureKeys.Score_9, 'assets/images/score/9.png');
        this.load.image(TextureKeys.Score_10, 'assets/images/score/10.png');

        // ========================================
        // 6. Audio (Phaser)
        // ========================================
        this.load.audio(AudioKeys.BgmNen, 'assets/audio/sfx/nhac_nen.mp3');
    }

    create() {
        // Request quyền microphone sớm để không bị delay khi bé bắt đầu đọc
        this.requestMicPermission();

        // Load Howler audio trước, rồi mới chuyển scene
        AudioManager.loadAll().then(() => {
            this.scene.start(SceneKeys.SpeakScene);
        });
    }

    /**
     * Xin quyền microphone ngay khi vào game.
     * Nếu user từ chối thì chỉ log warning, không block game.
     */
    private async requestMicPermission(): Promise<void> {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Đã được cấp quyền — dừng stream ngay để không giữ mic
            stream.getTracks().forEach(track => track.stop());
            console.log('Đã cấp quyền microphone');
        } catch (err) {
            console.warn('Cấp quyên microphone lỗi:', err);
        }
    }
}