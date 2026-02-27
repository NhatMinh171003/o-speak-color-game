/**
 * SpeakUI - Tạo các UI elements cho SpeakScene
 */
import Phaser from 'phaser';
import { TextureKeys } from '../../consts/Keys';
import { GameConstants } from '../../consts/GameConstants';

export interface SpeakUIElements {
    speakerBtn: Phaser.GameObjects.Image;
    microBtn: Phaser.GameObjects.Image;
    volumeBar: Phaser.GameObjects.Graphics;
    popup: Phaser.GameObjects.Image;
    popupText: Phaser.GameObjects.Text;
}

export interface SpeakUICallbacks {
    onSpeakerClick: () => void;
    onMicroClick: () => void;
    onMicroHover: (isOver: boolean) => void;
}

export class SpeakUI {
    private scene: Phaser.Scene;
    private w: number;
    private h: number;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.w = scene.scale.width;
        this.h = scene.scale.height;
    }

    /**
     * Tạo tất cả UI elements và trả về references
     */
    createAll(callbacks: SpeakUICallbacks): SpeakUIElements {
        const CFG = GameConstants.SPEAK_SCENE;

        // 1. BANNER
        this.scene.add.image(this.w * CFG.BANNER.X, this.h * CFG.BANNER.Y, TextureKeys.Speak_Banner)
            .setOrigin(0.5, 0)
            .setScale(CFG.BANNER.SCALE);

        // 2. BOARD/CANVAS
        this.scene.add.image(this.w * CFG.BOARD.X, this.h * CFG.BOARD.Y, TextureKeys.S1_Board)
            .setScale(CFG.BOARD.SCALE)
            .setAlpha(CFG.BOARD.ALPHA);

        // 3. TITLE
        this.scene.add.image(this.w * CFG.TITLE.X, this.h * CFG.TITLE.Y, TextureKeys.Speak_Title)
            .setScale(CFG.TITLE.SCALE);

        // chữ "Trích"
        this.scene.add.image(this.w * CFG.EXCERPT.X, this.h * CFG.EXCERPT.Y, TextureKeys.Speak_Excerpt)
            .setScale(CFG.EXCERPT.SCALE);

        // Tên tác giả
        this.scene.add.image(this.w * CFG.AUTHOR.X, this.h * CFG.AUTHOR.Y, TextureKeys.Speak_Author)
            .setScale(CFG.AUTHOR.SCALE);

        // 4. SMILE D ICON với animation
        const smileD = this.scene.add.image(this.w * CFG.SMILE_D.X, this.h * CFG.SMILE_D.Y, TextureKeys.Speak_SmileD)
            .setScale(CFG.SMILE_D.SCALE);

        this.scene.tweens.add({
            targets: smileD,
            angle: { from: -5, to: 5 },
            duration: CFG.ANIM.SHAKE_DURATION,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 5. CONTENT
        this.scene.add.image(this.w * CFG.CONTENT.X, this.h * CFG.CONTENT.Y, TextureKeys.Speak_Content)
            .setScale(CFG.CONTENT.SCALE);

        // 6. ILLUSTRATION với floating animation
        const illustration = this.scene.add.image(
            this.w * CFG.ILLUSTRATION.X,
            this.h * CFG.ILLUSTRATION.Y,
            TextureKeys.Speak_Illustration
        ).setScale(CFG.ILLUSTRATION.SCALE);

        this.scene.tweens.add({
            targets: illustration,
            y: this.h * CFG.ILLUSTRATION.Y - CFG.ANIM.FLOAT_DISTANCE,
            duration: CFG.ANIM.FLOAT_DURATION,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 7. SPEAKER BUTTON
        const speakerBtn = this.scene.add.image(
            this.w * CFG.SPEAKER.X,
            this.h * CFG.SPEAKER.Y,
            TextureKeys.Speak_Speaker
        )
            .setScale(CFG.SPEAKER.SCALE)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', callbacks.onSpeakerClick)
            .on('pointerover', () => speakerBtn.setScale(CFG.SPEAKER.SCALE + 0.08))
            .on('pointerout', () => speakerBtn.setScale(CFG.SPEAKER.SCALE));

        // 8. MICRO BUTTON (ẩn ban đầu)
        const microBtn = this.scene.add.image(
            this.w * CFG.MICRO.X,
            this.h * CFG.MICRO.Y,
            TextureKeys.Speak_Micro
        )
            .setScale(CFG.MICRO.SCALE)
            .setAlpha(0)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', callbacks.onMicroClick)
            .on('pointerover', () => callbacks.onMicroHover(true))
            .on('pointerout', () => callbacks.onMicroHover(false));

        // 9. Volume bar
        const volumeBar = this.scene.add.graphics().setDepth(50);

        // 10. Success popup (Generic)
        const { popup, popupText } = this.createSuccessPopup();

        // 11. Custom Score Board (Background trắng + Score Image + Loading)
        this.createScoreBoardUI();

        return { speakerBtn, microBtn, volumeBar, popup, popupText };
    }

    /**
     * Creating Score Board UI Elements
     * Background trắng (S1_Board) + Image container + Mascot container
     */
    private scoreBoard!: Phaser.GameObjects.Container;
    private scoreBoardBg!: Phaser.GameObjects.Image;
    private scoreImage!: Phaser.GameObjects.Image;
    private scoreLoadingText!: Phaser.GameObjects.Text;
    private scoreMascot!: Phaser.GameObjects.Sprite;

    private createScoreBoardUI(): void {
        const CFG = GameConstants.SPEAK_SCENE.SCORE_BOARD;
        const cx = this.w * CFG.X;
        const cy = this.h * CFG.Y;

        this.scoreBoard = this.scene.add.container(cx, cy).setDepth(200).setAlpha(0).setScale(0);

        // Background: Board White
        this.scoreBoardBg = this.scene.add.image(0, 0, TextureKeys.S1_Board).setScale(0.8);
        this.scoreBoard.add(this.scoreBoardBg);

        // Score Mascot (Hidden by default, used for loading)
        this.scoreMascot = this.scene.add.sprite(0, CFG.MASCOT_OFFSET_Y, 'mascot_processing')
            .setScale(CFG.MASCOT_SCALE)
            .setVisible(false);
        this.scoreBoard.add(this.scoreMascot);

        // Score Image (Hidden by default)
        this.scoreImage = this.scene.add.image(0, CFG.SCORE_IMG_OFFSET_Y, TextureKeys.Score_10)
            .setScale(CFG.SCORE_IMG_SCALE)
            .setVisible(false);
        this.scoreBoard.add(this.scoreImage);

        // Loading Text (Hidden by default)
        this.scoreLoadingText = this.scene.add.text(0, CFG.TEXT_OFFSET_Y, 'Đang tính toán điểm số...', {
            fontSize: '36px',
            fontFamily: 'Fredoka, sans-serif',
            color: '#333333',
            fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false);
        this.scoreBoard.add(this.scoreLoadingText);
    }

    /**
     * Show Loading Board (Có Mascot Processing trên board)
     */
    showLoadingBoard(message: string = 'Đang tính toán điểm số...'): void {
        const CFG = GameConstants.SPEAK_SCENE.SCORE_BOARD;

        // Reset/Setup visuals
        this.scoreImage.setVisible(false);
        this.scoreBoardBg.setScale(CFG.SCALE_LOADING);

        this.scoreLoadingText.setVisible(true).setText(message);

        this.scoreMascot.setVisible(true);
        // Play Processing animation
        if (this.scene.anims.exists('mascot_processing_anim')) {
            this.scoreMascot.play('mascot_processing_anim');
        } else if (this.scene.anims.exists('mascot_idle_anim')) {
            this.scoreMascot.play('mascot_idle_anim');
        }

        this.scoreBoard.setAlpha(1);
        this.scene.tweens.add({
            targets: this.scoreBoard,
            scale: 1,
            duration: 400,
            ease: 'Back.out'
        });
    }

    /**
     * Show Score Board
     */
    showScoreBoard(score: number): void {
        const CFG = GameConstants.SPEAK_SCENE.SCORE_BOARD;

        this.scoreLoadingText.setVisible(false);
        this.scoreMascot.stop();
        this.scoreMascot.setVisible(false);

        // Setup visuals for Score
        this.scoreBoardBg.setScale(CFG.SCALE_SCORE);

        // Determine texture key based on score
        let textureKey = TextureKeys.Score_10;
        switch (score) {
            case 4: textureKey = TextureKeys.Score_4; break;
            case 5: textureKey = TextureKeys.Score_5; break;
            case 6: textureKey = TextureKeys.Score_6; break;
            case 7: textureKey = TextureKeys.Score_7; break;
            case 8: textureKey = TextureKeys.Score_8; break;
            case 9: textureKey = TextureKeys.Score_9; break;
            case 10: textureKey = TextureKeys.Score_10; break;
            default:
                if (score < 4) textureKey = TextureKeys.Score_4;
                else textureKey = TextureKeys.Score_10;
        }

        this.scoreImage.setTexture(textureKey).setVisible(true);

        this.scoreBoard.setAlpha(1);
        this.scene.tweens.add({
            targets: this.scoreBoard,
            scale: 1,
            duration: 400,
            ease: 'Back.out'
        });
    }

    hideScoreBoard(): void {
        this.scene.tweens.add({
            targets: this.scoreBoard,
            scale: 0,
            alpha: 0,
            duration: 300,
            ease: 'Back.in',
            onComplete: () => {
                this.scoreImage.setVisible(false);
                this.scoreLoadingText.setVisible(false);
                this.scoreMascot.setVisible(false);
            }
        });
    }

    /**
     * Tạo success popup (Generic - cho các thông báo khác nếu cần)
     */
    private createSuccessPopup(): { popup: Phaser.GameObjects.Image; popupText: Phaser.GameObjects.Text } {
        const cx = this.w / 2;
        const cy = this.h / 2;

        const popup = this.scene.add.image(cx, cy, TextureKeys.BgPopup)
            .setScale(0)
            .setDepth(200);

        const popupText = this.scene.add.text(cx, cy, '', {
            fontSize: '35px',
            fontFamily: 'Fredoka, sans-serif',
            color: '#FF6B6B',
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: 320, useAdvancedWrap: true },
            stroke: '#000000',
            strokeThickness: 5,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#333333',
                blur: 3,
                fill: true
            }
        }).setOrigin(0.5).setDepth(201).setAlpha(0);

        return { popup, popupText };
    }

    /**
     * Hiển thị mic với animation
     */
    showMicAnimation(microBtn: Phaser.GameObjects.Image): void {
        const CFG = GameConstants.SPEAK_SCENE;
        this.scene.tweens.add({
            targets: microBtn,
            alpha: 1,
            scale: { from: 0.2, to: CFG.MICRO.SCALE },
            duration: 400,
            ease: 'Back.out'
        });
    }

    /**
     * Hiển thị success popup
     */
    showSuccessPopup(
        popup: Phaser.GameObjects.Image,
        popupText: Phaser.GameObjects.Text,
        message: string = '🎉 Tuyệt vời! 🎉'
    ): void {
        popupText.setText(message);
        // Hình chữ nhật: scaleX rộng hơn scaleY
        this.scene.tweens.add({ targets: popup, scaleX: 0.7, scaleY: 0.4, duration: 400, ease: 'Back.out' });
        // Giữ text ở giữa, không di chuyển
        this.scene.tweens.add({ targets: popupText, alpha: 1, duration: 400, delay: 200 });
    }
    /**
      * Ẩn popup
     */
    hidePopup(
        popup: Phaser.GameObjects.Image,
        popupText: Phaser.GameObjects.Text
    ): void {
        this.scene.tweens.add({ targets: popup, scale: 0, duration: 300, ease: 'Back.in' });
        this.scene.tweens.add({ targets: popupText, alpha: 0, duration: 200 });
    }

    hideSuccessPopup(popup: Phaser.GameObjects.Image, popupText: Phaser.GameObjects.Text): void {
        this.scene.tweens.add({ targets: popup, scale: 0, duration: 300, ease: 'Back.in' });
        this.scene.tweens.add({ targets: popupText, alpha: 0, duration: 300 });
    }

    // ===== SPEAK ANIMATION (Miệng nói khi phát đồng dao) =====
    private speakAnimSprite: Phaser.GameObjects.Image | null = null;
    private speakAnimTimer: Phaser.Time.TimerEvent | null = null;
    private speakAnimFrame: number = 0;

    /**
     * Hiển thị animation miệng nói (khi phát đồng dao)
     */
    showSpeakAnimation(): void {
        const ANIM_CFG = GameConstants.SPEAK_SCENE.SPEAK_ANIMATION;
        const animX = this.w * ANIM_CFG.X;
        const animY = this.h * ANIM_CFG.Y;

        // Cleanup nếu đang hiển thị
        this.hideSpeakAnimation();

        this.speakAnimFrame = 0;
        const firstFrame = ANIM_CFG.FRAMES[0];

        if (this.scene.textures.exists(firstFrame)) {
            this.speakAnimSprite = this.scene.add.image(animX, animY, firstFrame)
                .setOrigin(0, 0.5) // Gốc tọa độ: mép trái giữa
                .setScale(ANIM_CFG.SCALE)
                .setDepth(50)
                .setAlpha(1);
        }

        // Timer đổi frame
        this.speakAnimTimer = this.scene.time.addEvent({
            delay: ANIM_CFG.FRAME_DURATION,
            callback: () => {
                if (!this.speakAnimSprite) return;
                this.speakAnimFrame = (this.speakAnimFrame + 1) % ANIM_CFG.FRAMES.length;
                const nextFrame = ANIM_CFG.FRAMES[this.speakAnimFrame];
                this.speakAnimSprite.setTexture(nextFrame);
            },
            loop: true
        });
    }

    /**
     * Ẩn animation miệng nói
     */
    hideSpeakAnimation(): void {
        this.speakAnimTimer?.destroy();
        this.speakAnimTimer = null;

        this.speakAnimSprite?.destroy();
        this.speakAnimSprite = null;
        this.speakAnimFrame = 0;
    }
}
