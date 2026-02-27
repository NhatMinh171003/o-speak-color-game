/**
 * SpeakScene - Màn chơi 1: Nghe và đọc lại đoạn văn
 * 
 * Flow MỚI (Line-by-Line Reading):
 * 1. Phát nhạc nền + intro
 * 2. User nhấn loa để nghe bài đồng dao (ngón tay chỉ toàn bộ 6 dòng)
 * 3. Sau đồng dao -> hiện mic + hiển thị chỉ dòng 1 (ẩn dòng 2-6 bằng white boxes)
 * 4. User nhấn mic = bắt đầu ghi âm dòng hiện tại (max 45s/dòng)
 * 5. Sau mỗi dòng: CHỜ cả finger animation VÀ recording xong -> gửi API -> reveal dòng tiếp
 * 6. Sau dòng 6: tính điểm TB làm tròn 0.5, quyết định pass/retry
 */
import SceneBase from '../SceneBase';
import { SceneKeys } from '../../consts/Keys';
import { GameConstants } from '../../consts/GameConstants';
import AudioManager from '../../audio/AudioManager';
import { playVoiceLocked, resetVoiceState } from '../../utils/rotateOrientation';
import { DebugGrid } from '../../utils/DebugGrid';
import { AnimationFactory } from '../../utils/AnimationFactory';
import { sdk, gameSDK } from '../../main';
import { configureSdkContext, voice } from '@iruka-edu/mini-game-sdk';

// Helper classes
import { SpeakUI, type SpeakUIElements } from './SpeakUI';
import { SpeakVoice } from './SpeakVoice';
import { ReadingFinger } from './ReadingFinger';
import { LineMaskManager } from './LineMaskManager';
import { LineScoreManager } from './LineScoreManager';

// Configure SDK context for standalone mode
configureSdkContext({
    fallback: {
        gameId: GameConstants.BACKEND_SESSION.GAME_ID,
        lessonId: GameConstants.BACKEND_SESSION.LESSON_ID,
        gameVersion: GameConstants.BACKEND_SESSION.GAME_VERSION,
    },
});

// Pronun tracker (Item Tracker pronunciation) – dùng no-op nếu SDK chưa export createPronunTracker
type PronunTracker = {
    onPromptShown: (tsMs: number) => void;
    onRecordStart: (tsMs: number) => void;
    onRecordEnd: (tsMs: number) => void;
    onScored: (score01: number, details: Record<string, unknown>, tsMs: number) => void;
    onError: (errorCode: string, detail: Record<string, unknown>, tsMs: number) => void;
    finalize?: () => void;
    hint?: (n: number) => void;
};
const createPronunTracker: (opts: {
    meta: Record<string, unknown>;
    expected: { text: string; pass_threshold: number; scoring_rule?: Record<string, unknown> };
}) => PronunTracker = (gameSDK as any).createPronunTracker ?? function _noop() {
    return {
        onPromptShown: () => { },
        onRecordStart: () => { },
        onRecordEnd: () => { },
        onScored: () => { },
        onError: () => { },
        finalize: () => { },
        hint: () => { },
    };
};

export default class SpeakScene extends SceneBase {
    // UI Elements
    private ui!: SpeakUIElements;

    // Helpers
    private speakUI!: SpeakUI;
    private speakVoice!: SpeakVoice;
    private readingFinger!: ReadingFinger;
    private lineMasks!: LineMaskManager;
    private lineScores!: LineScoreManager;
    private debugGrid!: DebugGrid;
    private sessionStarted: boolean = false; // Track session state

    // Mascot Animations
    private mascotRecording!: AnimationFactory;
    private mascotProcessing!: AnimationFactory;
    private mascotHappy!: AnimationFactory;
    private mascotSad!: AnimationFactory;
    private mascotIdle!: AnimationFactory;

    // State
    private hasListened: boolean = false;
    private isMicVisible: boolean = false;
    private isReadingMode: boolean = false;  // true khi đang ở chế độ đọc từng dòng
    private isSpeaking: boolean = false;     // true khi đang phát bài đồng dao (không cho ấn loa)
    private isRecordingSession: boolean = false; // true khi đang trong phiên ghi âm (không cho ấn loa)

    // Loop timer cho hand hint chỉ vào mic liên tục
    private micHintLoop: Phaser.Time.TimerEvent | null = null;

    // Timers cho speaking flow (cần cancel khi xoay màn hình)
    private speakingTimers: Phaser.Time.TimerEvent[] = [];

    // Sync state cho finger animation + recording
    private pendingLineData: {
        lineIndex: number;
        audioBlob: Blob | null;
        fingerComplete: boolean;
        recordingComplete: boolean;
        durationMs: number; // Thời gian ghi âm (ms)
    } | null = null;

    // ===== Pronun Trackers (mỗi line = 1 item pronunciation) =====
    private pronunRunSeq = 1;
    private pronunItemSeq = 0;
    private pronunByLine = new Map<number, PronunTracker>();
    private hintCountedForLine = new Set<number>();
    private playbackCountByLine = new Map<number, number>();

    constructor() {
        super(SceneKeys.SpeakScene);
    }

    create() {
        // ========================================
        // RESET ALL STATE khi scene được tạo/restart
        // ========================================
        this.hasListened = false;
        this.isMicVisible = false;
        this.isReadingMode = false;
        this.isSpeaking = false;
        this.isRecordingSession = false;
        this.micHintLoop = null;
        this.speakingTimers = [];
        this.pendingLineData = null;
        this.pronunByLine.clear();
        this.hintCountedForLine.clear();
        this.playbackCountByLine.clear();

        this.setupSystem();
        this.setupBackgroundAndAudio();
        this.createHandHint();
        // Register mascot animations FIRST (before createUI uses them)
        this.setupMascotAnimations();
        this.createUI();
        this.setupHelpers();
        this.initGameFlow();
        this.events.on('wake', this.handleWake, this);

        // ========================================
        // SDK INTEGRATION: Khởi tạo game state
        // ========================================
        // Tổng số câu hỏi = 6 câu đọc + 3 câu gạch chân
        const TOTAL_SPEAKING_LINES = GameConstants.SPEAK_SCENE.LINE_READING.TOTAL_LINES; // 6
        const TOTAL_UNDERLINE_ITEMS = 3;
        const TOTAL_QUESTIONS = TOTAL_SPEAKING_LINES + TOTAL_UNDERLINE_ITEMS; // 9
        gameSDK.setTotal(TOTAL_QUESTIONS);

        window.irukaGameState = {
            startTime: Date.now(),
            currentScore: 0,
        };

        // Gọi sdk sau khi đã được khởi tạo (trong startWithAudio callback)
        // sdk.score và sdk.progress sẽ được gọi sau khi game bắt đầu

        // FIX: Pause/Resume audio khi chuyển tab để đồng bộ với animations
        this.setupVisibilityHandler();

        // ============================================================
        // DEBUG: Comment dòng này khi lên production
        // this.debugGrid = new DebugGrid(this);
        // this.debugGrid.draw({ showGrid: true, showReadingLines: true });
        // DEBUG: Nhấn phím S để skip sang màn tiếp
        //this.input.keyboard?.on('keydown-S', () => {
        //    console.log('[DEBUG] Skipping to UnderlineScene...');
        //    this.scene.start(SceneKeys.UnderlineScene);
        //});
    }

    update(_time: number, delta: number) {
        this.idleManager.update(delta);
    }

    shutdown() {
        this.stopMicHintLoop(); // Cleanup mic hint loop
        this.removeVisibilityHandler(); // Cleanup visibility handler
        this.speakVoice?.destroy();
        this.readingFinger?.destroy();
        this.lineMasks?.destroy();
        this.debugGrid?.destroy();
        // Mascot cleanup
        this.mascotRecording?.destroy();
        this.mascotProcessing?.destroy();
        this.mascotHappy?.destroy();
        this.mascotSad?.destroy();
        this.cleanupScene();
    }

    // ========================================
    // VISIBILITY HANDLER (Pause/Resume khi chuyển tab)
    // ========================================

    private visibilityHandler: (() => void) | null = null;

    /**
     * Setup handler để pause/resume audio khi chuyển tab
     * Giúp đồng bộ audio với animations (Phaser pause khi tab ẩn)
     */
    private setupVisibilityHandler(): void {
        this.visibilityHandler = () => {
            if (document.hidden) {
                // Tab bị ẩn → Pause audio để đồng bộ với Phaser animations
                console.log('[SpeakScene] Tab hidden - pausing audio');
                AudioManager.pauseAll();
            } else {
                // Tab hiện lại → Resume audio
                console.log('[SpeakScene] Tab visible - resuming audio');
                AudioManager.resumeAll();
            }
        };
        document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    /**
     * Cleanup visibility handler khi scene bị destroy
     */
    private removeVisibilityHandler(): void {
        if (this.visibilityHandler) {
            document.removeEventListener('visibilitychange', this.visibilityHandler);
            this.visibilityHandler = null;
        }
    }

    // ========================================
    // PRONUN TRACKER (Item Tracker per line)
    // ========================================

    private getLineText(lineIndex: number): string {
        return GameConstants.SPEAK_SCENE.LINE_READING.KEYWORDS_PER_LINE[lineIndex] ?? '';
    }

    private ensurePronunItemForLine(lineIndex: number): PronunTracker {

        let t = this.pronunByLine.get(lineIndex);
        if (t) return t;

        this.pronunItemSeq += 1;

        t = createPronunTracker({
            meta: {
                item_id: `READ_TEXT_${String(lineIndex + 1).padStart(3, '0')}`,
                item_type: 'pronunciation',
                seq: this.pronunItemSeq,
                run_seq: this.pronunRunSeq,
                difficulty: 1,
                scene_id: 'SCN_READ_01',
                scene_seq: lineIndex + 1,
                scene_type: 'pronunciation',
                skill_ids: ['doc_thanh_tieng_34_tv_003'],
            },
            expected: {
                text: this.getLineText(lineIndex),
                pass_threshold: 0.75,
                scoring_rule: { by: ['word', 'phoneme', 'rhythm'] },
            },
        });

        t.onPromptShown(Date.now());
        this.pronunByLine.set(lineIndex, t);
        return t;
    }

    // ========================================
    // SETUP
    // ========================================

    private setupHelpers(): void {
        // Line Masks Manager
        this.lineMasks = new LineMaskManager(this);

        // Line Score Manager - Dùng SDK voice.Submit trực tiếp
        this.lineScores = new LineScoreManager({ testmode: true });

        // Reading Finger with callbacks
        this.readingFinger = new ReadingFinger(this, {
            onLineComplete: (lineIndex) => this.onSingleLineReadComplete(lineIndex),
            onAllLinesComplete: () => this.onListeningComplete()
        });

        // Voice Handler
        this.speakVoice = new SpeakVoice(
            this,
            this.ui.microBtn,
            this.ui.volumeBar,
            {
                onRecordingComplete: (result) => this.onLineRecordingComplete(result),
                onRecordingError: (err) => this.showRetryPopup('⚠️ ' + err)
            }
        );
        // NOTE: Mascot Animations are setup in setupMascotAnimations() which is called earlier
    }

    /**
     * Mascot animations need to be registered BEFORE createUI
     * because SpeakUI.createScoreBoardUI uses 'mascot_processing' sprite
     */
    private setupMascotAnimations(): void {
        const MASCOT = GameConstants.MASCOT_ANIMATIONS;
        this.mascotRecording = new AnimationFactory(this, { ...MASCOT, ...MASCOT.RECORDING });
        this.mascotProcessing = new AnimationFactory(this, { ...MASCOT, ...MASCOT.PROCESSING });
        this.mascotHappy = new AnimationFactory(this, { ...MASCOT, ...MASCOT.RESULT_HAPPY });
        this.mascotSad = new AnimationFactory(this, { ...MASCOT, ...MASCOT.RESULT_SAD });
        this.mascotIdle = new AnimationFactory(this, { ...MASCOT, ...MASCOT.IDLE });
    }

    /**
     * Dừng tất cả mascot animations để chuyển sang trạng thái mới
     */
    private stopAllMascots(): void {
        this.mascotRecording?.stop();
        this.mascotProcessing?.stop();
        this.mascotHappy?.stop();
        this.mascotSad?.stop();
        this.mascotIdle?.stop();
    }

    /**
     * Hiển thị mascot idle (đứng yên)
     */
    private showMascotIdle(): void {
        this.stopAllMascots();
        this.mascotIdle.play();
    }

    // ========================================
    // UI CREATION
    // ========================================

    protected createUI(): void {
        this.speakUI = new SpeakUI(this);
        this.ui = this.speakUI.createAll({
            onSpeakerClick: () => this.onSpeakerClick(),
            onMicroClick: () => this.onMicroClick(),
            onMicroHover: (isOver) => this.onMicroHover(isOver)
        });
    }

    // ========================================
    // GAME FLOW
    // ========================================

    protected initGameFlow(): void {
        if (this.input.keyboard) this.input.keyboard.enabled = false;

        // Block loa ngay từ đầu cho đến khi intro-speak phát xong
        this.isSpeaking = true;

        // Bước 2: Start backend session TRƯỚC KHI bắt đầu game
        this.startBackendSession().catch(err => {
            console.error('[SpeakScene] Failed to start session in initGameFlow:', err);
        });

        this.startWithAudio(() => {
            console.log('[SpeakScene] startWithAudio callback - playing intro-speak');
            this.playBgm();
            this.isGameActive = true;

            // Gọi sdk sau khi đã được khởi tạo
            try {
                sdk.score(0, 0);
                sdk.progress({ levelIndex: 0, total: 2 }); // 2 màn: SpeakScene + Scene2
            } catch (e) {
                console.warn('[SpeakScene] SDK not ready yet:', e);
            }

            playVoiceLocked(null, 'intro-speak');

            // Hiện ngón tay chỉ vào speaker
            this.time.delayedCall(500, () => {
                // Kiểm tra button đã có tọa độ hợp lệ chưa (tránh race condition)
                if (this.ui.speakerBtn && this.ui.speakerBtn.x > 0 && this.ui.speakerBtn.y > 0) {
                    this.animateHandHintTo(this.ui.speakerBtn.x, this.ui.speakerBtn.y);
                }
            });

            const introDuration = AudioManager.getDuration('intro-speak') || 3;
            this.time.delayedCall((introDuration + 0.5) * 1000, () => {
                if (this.isGameActive) {
                    // Cho phép ấn loa sau khi intro-speak phát xong
                    this.isSpeaking = false;
                    this.idleManager.start();
                }
            });

            if (this.input.keyboard) this.input.keyboard.enabled = true;
            this.showButtons();
        });
    }

    protected showIdleHint(): void {
        if (!this.hasListened && this.ui.speakerBtn?.x > 0) {
            this.animateHandHintTo(this.ui.speakerBtn.x, this.ui.speakerBtn.y);
        } else if (this.isMicVisible && !this.speakVoice.isRecording && this.ui.microBtn?.x > 0) {
            this.animateHandHintTo(this.ui.microBtn.x, this.ui.microBtn.y);
        }
    }

    // ========================================
    // EVENT HANDLERS
    // ========================================

    private onSpeakerClick(): void {
        console.log(`[SpeakScene] Speaker clicked - isGameActive: ${this.isGameActive}, isSpeaking: ${this.isSpeaking}, isRecordingSession: ${this.isRecordingSession}, isReadingMode: ${this.isReadingMode}`);

        // Không cho ấn loa khi: đang phát audio HOẶC đang ghi âm
        if (!this.isGameActive || this.isSpeaking || this.isRecordingSession) {
            console.log('[SpeakScene] Speaker click BLOCKED');
            return;
        }

        // Đánh dấu đang phát NGAY LẬP TỨC để block mic click
        this.isSpeaking = true;
        console.log(`[SpeakScene] Speaker click ALLOWED, isReadingMode: ${this.isReadingMode}`);

        const CFG = GameConstants.SPEAK_SCENE;
        this.resetIdleState();
        this.idleManager.stop();

        // Button press animation
        this.tweens.add({
            targets: this.ui.speakerBtn,
            scale: CFG.SPEAKER.SCALE - 0.1,
            duration: 100,
            yoyo: true,
            onComplete: () => this.ui.speakerBtn.setScale(CFG.SPEAKER.SCALE)
        });

        // Dừng audio đang phát
        resetVoiceState();
        AudioManager.stopAll();

        // ===== PHÂN BIỆT 2 TRƯỜNG HỢP =====
        if (this.isReadingMode) {
            // Đếm playback (bé bấm loa nghe lại prompt) cho item tracker
            const cur = this.lineMasks.currentLine;
            this.playbackCountByLine.set(cur, (this.playbackCountByLine.get(cur) ?? 0) + 1);
            // ĐANG Ở GIỮA MÀN CHƠI: Chỉ phát lại prompt của dòng hiện tại
            const currentLine = this.lineMasks.currentLine;
            const promptKey = CFG.LINE_READING.LINE_PROMPTS[currentLine];

            console.log(`[SpeakScene] Replay prompt for line ${currentLine + 1}: ${promptKey}`);

            if (promptKey) {
                AudioManager.play(promptKey);
                const promptDuration = AudioManager.getDuration(promptKey) || 3;

                this.time.delayedCall(promptDuration * 1000, () => {
                    this.isSpeaking = false;
                });
            } else {
                this.isSpeaking = false;
            }
        } else {
            // CHƯA BẮT ĐẦU: Phát cả bài đồng dao
            if (this.bgm && this.bgm.isPlaying) this.bgm.stop();

            // Cancel các timer cũ trước khi tạo mới
            this.cancelSpeakingTimers();

            // Dùng playVoiceLocked để tracking state cho xoay màn hình
            playVoiceLocked(null, 'voice-speaking');
            this.hasListened = true;

            // Bắt đầu hiệu ứng ngón tay chỉ đọc toàn bộ 6 dòng
            this.readingFinger.startFullAnimation();

            // Hiển thị animation miệng nói
            this.speakUI.showSpeakAnimation();

            const speakDuration = AudioManager.getDuration('voice-speaking') || 10;

            // Lưu reference các timer để có thể cancel khi xoay màn hình
            const hideAnimTimer = this.time.delayedCall(speakDuration * 1000, () => {
                if (!this.isGameActive) return;

                // KHÔNG reset isSpeaking ở đây - giữ block loa cho đến khi intro-voice phát xong
                this.speakUI.hideSpeakAnimation();
            });
            this.speakingTimers.push(hideAnimTimer);

            const showMicTimer = this.time.delayedCall((speakDuration + CFG.TIMING.DELAY_SHOW_MIC / 1000) * 1000, () => {
                if (!this.isGameActive) return;
                this.showMicWithHint();
            });
            this.speakingTimers.push(showMicTimer);
        }
    }

    /**
     * Cancel tất cả timer liên quan đến speaking flow
     */
    private cancelSpeakingTimers(): void {
        this.speakingTimers.forEach(timer => {
            if (timer) timer.destroy();
        });
        this.speakingTimers = [];
    }

    /**
     * Restart phần đọc bài đồng dao (Speak.mp3 + ngón tay)
     * Gọi khi xoay màn hình dọc rồi xoay ngang lại
     */
    public restartSpeaking(): void {
        console.log('[SpeakScene] restartSpeaking called - cancelling old timers and restarting');

        // 1. Cancel tất cả timer cũ
        this.cancelSpeakingTimers();

        // 2. Dừng audio đang phát
        AudioManager.stop('voice-speaking');

        // 3. Reset ngón tay
        this.readingFinger?.stopAnimation();

        // 4. Ẩn speak animation nếu đang hiện
        this.speakUI?.hideSpeakAnimation();

        // 5. Reset state - set isSpeaking = false để onSpeakerClick không bị block
        this.hasListened = false;
        this.isSpeaking = false;

        // 6. Dừng BGM nếu đang phát
        if (this.bgm && this.bgm.isPlaying) this.bgm.stop();

        // 7. Delay nhỏ rồi phát lại từ đầu
        this.time.delayedCall(300, () => {
            if (!this.isGameActive) return;

            // Trigger lại speaker click flow (onSpeakerClick sẽ set isSpeaking = true)
            this.onSpeakerClick();
        });
    }

    /**
     * Callback khi ngón tay chỉ xong toàn bộ (listening mode)
     */
    private onListeningComplete(): void {
        console.log('[SpeakScene] Listening complete');
    }

    private showMicWithHint(): void {
        this.isMicVisible = true;
        this.isReadingMode = true;

        // Line 1 được show => prompt_shown_at_ms
        this.ensurePronunItemForLine(0);

        // Hiển thị mascot idle (đứng yên) chờ user nhấn mic
        this.showMascotIdle();

        // Hiển thị masks cho reading mode (ẩn dòng 2-6)
        this.lineMasks.showMasksForReading();

        this.speakUI.showMicAnimation(this.ui.microBtn);
        AudioManager.play('intro-voice');

        // Cho phép ấn loa lại SAU KHI intro-voice phát xong
        const introVoiceDuration = AudioManager.getDuration('intro-voice') || 3;
        this.time.delayedCall(introVoiceDuration * 1000, () => {
            if (this.isGameActive) {
                this.isSpeaking = false;
            }
        });

        // Bắt đầu loop hand hint chỉ vào mic liên tục cho đến khi ấn
        this.startMicHintLoop();
    }

    /**
     * Bắt đầu loop hand hint chỉ vào mic liên tục
     * Sẽ dừng khi người dùng ấn mic
     */
    private startMicHintLoop(): void {
        // Dừng loop cũ nếu có
        this.stopMicHintLoop();

        // Hint chỉ tính 1 lần/line (vì loop 4s)
        const lineIndex = this.lineMasks.currentLine;
        const tr = this.ensurePronunItemForLine(lineIndex);
        if (!this.hintCountedForLine.has(lineIndex)) {
            tr.hint?.(1);
            this.hintCountedForLine.add(lineIndex);
        }

        // Hiện hint ngay lập tức sau 500ms
        this.time.delayedCall(500, () => {
            // Kiểm tra mic button đã có tọa độ hợp lệ chưa (tránh race condition)
            if (this.isMicVisible && !this.speakVoice.isRecording && this.isGameActive &&
                this.ui.microBtn?.x > 0 && this.ui.microBtn?.y > 0) {
                this.animateHandHintTo(this.ui.microBtn.x, this.ui.microBtn.y);
            }
        });

        // Lặp lại mỗi 4 giây (sau khi animation hint kết thúc)
        this.micHintLoop = this.time.addEvent({
            delay: 4000,
            callback: () => {
                // Kiểm tra mic button đã có tọa độ hợp lệ chưa
                if (this.isMicVisible && !this.speakVoice.isRecording && this.isGameActive &&
                    this.ui.microBtn?.x > 0 && this.ui.microBtn?.y > 0) {
                    this.animateHandHintTo(this.ui.microBtn.x, this.ui.microBtn.y);
                }
            },
            loop: true
        });
    }

    /**
     * Dừng loop hand hint chỉ vào mic
     */
    private stopMicHintLoop(): void {
        if (this.micHintLoop) {
            this.micHintLoop.destroy();
            this.micHintLoop = null;
        }
        this.resetIdleState(); // Ẩn hand hint nếu đang hiện
    }

    private onMicroClick(): void {
        // Không cho ấn mic khi: đang phát audio HOẶC đang ghi âm
        if (!this.isGameActive || !this.isMicVisible || this.isSpeaking || this.isRecordingSession) return;

        // Đánh dấu đang ghi âm NGAY LẬP TỨC để block speaker click
        this.isRecordingSession = true;
        this.isMicVisible = false;

        this.hidePopup();

        // Dừng loop hint khi ấn mic
        this.stopMicHintLoop();
        this.idleManager.stop();

        // Dừng tất cả audio đang phát (prompt hướng dẫn) khi người dùng ấn mic
        resetVoiceState();
        AudioManager.stopAll();

        const currentLine = this.lineMasks.currentLine;
        console.log(`[SpeakScene] Mic clicked, starting line ${currentLine + 1}`);

        const tr = this.ensurePronunItemForLine(currentLine);
        tr.onRecordStart(Date.now());

        // Reset pending state cho dòng mới
        this.pendingLineData = {
            lineIndex: currentLine,
            audioBlob: null,
            fingerComplete: false,
            recordingComplete: false,
            durationMs: 0 // Sẽ được set khi recording complete
        };

        // Chuyển từ idle → recording mascot
        this.stopAllMascots();
        this.mascotRecording.play();

        // Bắt đầu ghi âm + animation ngón tay cho dòng hiện tại
        this.speakVoice.toggleForLine(currentLine);
        this.readingFinger.startSingleLineAnimation(currentLine);
    }

    /**
     * Callback khi ngón tay chỉ xong 1 dòng (reading mode)
     */
    private onSingleLineReadComplete(lineIndex: number): void {
        console.log(`[SpeakScene] Single line ${lineIndex + 1} finger animation complete`);

        // Đánh dấu finger hoàn thành
        if (this.pendingLineData && this.pendingLineData.lineIndex === lineIndex) {
            this.pendingLineData.fingerComplete = true;
            this.trySubmitLineAndProceed();
        }
    }

    private onMicroHover(isOver: boolean): void {
        if (!this.isMicVisible || this.speakVoice.isRecording) return;

        const CFG = GameConstants.SPEAK_SCENE;
        const scale = isOver ? CFG.MICRO.SCALE + 0.08 : CFG.MICRO.SCALE;
        this.ui.microBtn.setScale(scale);
    }

    // ========================================
    // CALLBACKS
    // ========================================

    /**
     * Callback khi ghi âm xong 1 dòng
     */
    private onLineRecordingComplete(result: { score: number; status: string; passed: boolean; audioBlob?: Blob; durationMs?: number }): void {
        console.log(`[SpeakScene] Recording complete callback received`);

        // NOTE: Không reset isRecordingSession ở đây vì trong TEST_MODE callback được gọi ngay
        // Reset sẽ được thực hiện trong trySubmitLineAndProceed() khi cả finger + recording đều xong

        if (!this.pendingLineData) {
            console.warn(`[SpeakScene] No pendingLineData, ignoring recording callback`);
            return;
        }

        const lineIndex = this.pendingLineData.lineIndex;
        console.log(`[SpeakScene] Line ${lineIndex + 1} recording complete, blob size: ${result.audioBlob?.size ?? 0}`);

        const tr = this.ensurePronunItemForLine(lineIndex);
        tr.onRecordEnd(Date.now());

        // Đánh dấu recording hoàn thành (mascot sẽ stop trong trySubmitLineAndProceed)
        this.pendingLineData.recordingComplete = true;
        this.pendingLineData.audioBlob = result.audioBlob || null;
        this.pendingLineData.durationMs = result.durationMs || 3000; // Lưu durationMs
        this.trySubmitLineAndProceed();
    }

    /**
     * CHỜ cả finger animation VÀ recording xong mới gửi API + reveal dòng tiếp
     */
    private trySubmitLineAndProceed(): void {
        if (!this.pendingLineData) return;

        const { fingerComplete, recordingComplete, audioBlob, lineIndex, durationMs } = this.pendingLineData;

        // Chờ cả 2 hoàn thành
        if (!fingerComplete || !recordingComplete) {
            console.log(`[SpeakScene] Waiting... finger: ${fingerComplete}, recording: ${recordingComplete}`);
            return;
        }

        // Kết thúc phiên ghi âm - cho phép ấn loa lại
        this.isRecordingSession = false;

        console.log(`[SpeakScene] Line ${lineIndex + 1} BOTH complete, submitting API...`);

        // Kiểm tra đã đọc hết chưa
        const totalLines = GameConstants.SPEAK_SCENE.LINE_READING.TOTAL_LINES;
        const isLastLine = (lineIndex + 1) >= totalLines;

        // Dừng mascot recording → chuyển về idle CHỈ giữa các dòng (không phải dòng cuối)
        // Dòng cuối sẽ chuyển sang Processing ngay
        if (!isLastLine) {
            this.showMascotIdle();
        }

        const tr = this.ensurePronunItemForLine(lineIndex);

        // Gửi API; khi có điểm → onScored + finalize + recordCorrect/recordWrong theo từng dòng
        if (audioBlob) {
            this.lineScores.submitLineScore(lineIndex, audioBlob, durationMs)
                .then((resp) => {
                    if (!resp) return;
                    const score01 = resp.score > 1 ? resp.score / 100 : resp.score;
                    tr.onScored(score01, {
                        playback_count: this.playbackCountByLine.get(lineIndex) ?? 0,
                        audio_record_id: null,
                        transcript: resp.transcript ?? '',
                        latency_seconds: resp.latency_seconds ?? 0,
                        raw_score_100: resp.score,
                    }, Date.now());
                    tr.finalize?.();
                    this.pronunByLine.delete(lineIndex);
                    const ok = score01 >= 0.75;
                    if (ok) gameSDK.recordCorrect({ scoreDelta: 1 });
                    else gameSDK.recordWrong?.();
                })
                .catch((err) => {
                    tr.onError('SYSTEM_ERROR', { message: String(err) }, Date.now());
                    tr.finalize?.();
                    this.pronunByLine.delete(lineIndex);
                });
        }

        // Cập nhật progress UI
        sdk.progress({ levelIndex: 0 });

        // Clear pending state
        this.pendingLineData = null;

        if (isLastLine) {
            // Đã đọc xong tất cả → reveal và chuyển sang scoring
            console.log(`[SpeakScene] Last line (${lineIndex + 1}) completed, going to scoring...`);
            this.lineMasks.revealNextLine();
            this.onAllLinesComplete();
        } else {
            // Còn dòng tiếp → FLOW MỚI:
            // 1. Hiển thị mascot idle (đã set ở trên)
            // 2. DISABLE MIC để tránh click sớm
            // 3. Phát audio prompt
            // 4. Chờ audio xong → reveal dòng tiếp + enable mic
            const nextLine = this.lineMasks.currentLine + 1; // +1 vì chưa revealNextLine
            const promptKey = GameConstants.SPEAK_SCENE.LINE_READING.LINE_PROMPTS[nextLine];

            this.isMicVisible = false;
            this.ui.microBtn.setAlpha(0.3); // Visual feedback: mic mờ đi

            if (promptKey && promptKey !== 'intro-voice') {
                console.log(`[SpeakScene] Playing prompt for line ${nextLine + 1}: ${promptKey}`);

                // Block loa trong khi phát prompt
                this.isSpeaking = true;
                // Dùng playAfterRecording để fade-in mask HTML5 audio startup gap sau khi mic stop
                AudioManager.play(promptKey);

                // Reveal dòng tiếp và hiện bàn tay chỉ dẫn NGAY KHI audio bắt đầu phát
                this.lineMasks.revealNextLine();
                this.ensurePronunItemForLine(this.lineMasks.currentLine);
                console.log(`[SpeakScene] Revealed line ${this.lineMasks.currentLine + 1} simultaneously with prompt audio`);

                // Hiện reading finger chỉ dọc dòng thơ trong khi prompt phát
                // this.readingFinger.startSingleLineAnimation(this.lineMasks.currentLine);

                // Chờ audio prompt xong mới cho nhấn mic
                const promptDuration = AudioManager.getDuration(promptKey) || 2;
                this.time.delayedCall((promptDuration + 0.3) * 1000, () => {
                    if (this.isGameActive) {
                        // Prompt phát xong → cho phép ấn loa lại
                        this.isSpeaking = false;

                        // RE-ENABLE mic + bắt đầu loop hint
                        this.isMicVisible = true;
                        this.ui.microBtn.setAlpha(1);
                        this.startMicHintLoop();
                    }
                });
            } else {
                // Không có prompt → reveal ngay và enable mic + bắt đầu loop hint
                this.lineMasks.revealNextLine();
                this.ensurePronunItemForLine(this.lineMasks.currentLine);
                this.isMicVisible = true;
                this.ui.microBtn.setAlpha(1);
                this.startMicHintLoop();
            }
        }
    }

    /**
     * Bước 2: Start backend session
     * IMPORTANT: Always start a fresh session, don't try to resume old sessions
     */
    private async startBackendSession(): Promise<void> {
        try {
            console.log('[SpeakScene] Starting backend session...');

            // Clear any old session from localStorage to prevent cache issues
            localStorage.removeItem('voice_session_id');

            // Sử dụng voice.StartSession từ SDK
            const response = await voice.StartSession({ testmode: true });

            this.sessionStarted = true;

            console.log('[SpeakScene] Backend session started:', {
                sessionId: response.sessionId,
                index: response.index,
                quotaRemaining: response.quotaRemaining,
                allowPlay: response.allowPlay,
            });
        } catch (error) {
            console.error('[SpeakScene] Failed to start backend session:', error);
            localStorage.removeItem('voice_session_id');
        }
    }

    /**
     * Bước 2: End backend session - Sử dụng voice.EndSession từ SDK
     */
    private async endBackendSession(isUserAborted: boolean = false): Promise<number | null> {
        if (!this.sessionStarted) {
            console.warn('[SpeakScene] No active session to end');
            return null;
        }

        try {
            console.log('[SpeakScene] Ending backend session...');

            const totalLines = GameConstants.SPEAK_SCENE.LINE_READING.TOTAL_LINES;

            // Sử dụng voice.EndSession từ SDK
            const response = await voice.EndSession({
                totalQuestionsExpect: totalLines,
                isUserAborted: isUserAborted,
                testmode: true,
            });

            this.sessionStarted = false;

            console.log('[SpeakScene] Backend session ended:', {
                status: response.status,
                finalScore: response.finalScore,
                quotaDeducted: response.quotaDeducted,
            });

            localStorage.removeItem('voice_session_id');
            return response.finalScore ?? null;
        } catch (error) {
            console.error('[SpeakScene] Failed to end backend session:', error);
            this.sessionStarted = false;
            localStorage.removeItem('voice_session_id');
            return null;
        }
    }

    /**
     * Callback khi đọc xong tất cả 6 dòng
     */
    private async onAllLinesComplete(): Promise<void> {
        console.log('[SpeakScene] All lines complete (animation finished), waiting for final score...');

        // Dừng tất cả audio đang phát
        resetVoiceState();
        AudioManager.stopAll();

        // Hiển thị loading board + Mascot Processing trong khi chờ API
        this.speakUI.showLoadingBoard('');
        this.stopAllMascots();
        this.mascotProcessing.play();

        try {
            // CHỜ TẤT CẢ API SUBMIT XONG TRƯỚC KHI END SESSION
            // Đảm bảo tất cả các line (kể cả line 6) đã submit xong
            const localScore = await this.lineScores.getFinalScore();

            // END SESSION SAU KHI TẤT CẢ API ĐÃ SUBMIT XONG
            // Đảm bảo line 6 đã submit xong trước khi end session
            const backendScore = await this.endBackendSession(false);

            // Dùng điểm từ backend làm source of truth, fallback sang local nếu không có
            const finalScore = backendScore ?? localScore;
            console.log(`[SpeakScene] Scores - backend: ${backendScore}, local: ${localScore}, using: ${finalScore}`);

            // Logic Pass/Retry
            const isRetryRange = finalScore >= 4 && finalScore <= 5;
            const passed = finalScore >= GameConstants.VOICE_RECORDING.PASS_THRESHOLD;

            console.log(`[SpeakScene] Final score: ${finalScore}/10, passed: ${passed}, isRetryRange: ${isRetryRange}`);

            // Đúng/sai đã được ghi nhận từng dòng trong trySubmitLineAndProceed (onScored → recordCorrect/recordWrong)

            // Cập nhật điểm và game state
            window.irukaGameState.currentScore = finalScore;
            sdk.score(finalScore, 1);

            // Dừng mascot Processing (loading xong)
            this.mascotProcessing.stop();

            // Hiển thị Score Board (vẫn giữ board trắng)
            this.speakUI.showScoreBoard(finalScore);

            // Phát audio điểm: score_4.mp3, score_5.mp3, ..., score_10.mp3
            const scoreAudioKey = `score-${finalScore}`;
            AudioManager.play(scoreAudioKey);
            console.log(`[SpeakScene] Playing score audio: ${scoreAudioKey}`);

            // Lấy duration của audio điểm, đảm bảo delay đủ lâu để audio phát hết
            const scoreDuration = AudioManager.getDuration(scoreAudioKey) || 3;
            const delayTime = Math.max(
                GameConstants.SPEAK_SCENE.TIMING.DELAY_NEXT_SCENE,
                (scoreDuration + 0.5) * 1000  // +0.5s buffer
            );

            if (passed) {
                // --- CASE 1: PASS (>= threshold) ---
                this.mascotHappy.play();

                // Delay chuyển màn - đợi audio điểm phát xong
                this.time.delayedCall(delayTime, () => {
                    this.mascotHappy.stop();
                    this.speakUI.hideScoreBoard();
                    this.nextScene();
                });

            } else {
                // --- CASE 2: FAIL (< threshold) ---
                this.mascotSad.play();

                if (isRetryRange) {
                    // Special Retry Logic for 4-5 score:
                    // "quay về thời điểm khi vừa hết phần đọc mẫu bài đồng dao"
                    console.log('[SpeakScene] Score 4-5 -> Auto retry from post-intro');

                    this.time.delayedCall(delayTime, () => {
                        this.mascotSad.stop();
                        this.speakUI.hideScoreBoard();
                        this.resetForRetryMidGame();
                    });

                } else {
                    // Normal Retry (điểm < 4 hoặc 6)
                    this.time.delayedCall(delayTime, () => {
                        this.mascotSad.stop();
                        this.speakUI.hideScoreBoard();
                        this.resetForRetryMidGame();
                    });
                }
            }

        } catch (err) {
            console.error('[SpeakScene] Error getting final score:', err);
            this.speakUI.hideScoreBoard();
            this.showRetryPopup('❌ Lỗi! Hãy thử lại.');
            this.time.delayedCall(2000, () => {
                this.speakUI.hideSuccessPopup(this.ui.popup, this.ui.popupText);
                this.resetForRetryMidGame();
            });
        }
    }

    /**
     * Reset lại state để thử lại (quay về trạng thái ban đầu hoàn toàn)
     * Người dùng phải nghe lại intro-speak và ấn loa để nghe bài đồng dao
     */
    private resetForRetryMidGame(): void {
        console.log('[SpeakScene] Resetting for retry (Full Reset)...');

        // FIX: Dừng tất cả audio trước khi reset để tránh chồng chéo
        resetVoiceState();
        AudioManager.stopAll();

        // SDK: Ghi nhận retry từ đầu
        gameSDK.retryFromStart();

        this.pronunRunSeq += 1;
        this.pronunByLine.clear();
        this.hintCountedForLine.clear();
        this.playbackCountByLine.clear();

        // 1. Reset Logic Helpers
        this.lineMasks.resetStates(); // Che lại tất cả (hiện toàn bộ nội dung)
        this.lineScores.reset();      // Xóa điểm cũ

        // Reset session và tạo session mới cho retry
        this.sessionStarted = false;
        this.startBackendSession().catch(err => {
            console.error('[SpeakScene] Failed to start session in resetForRetryMidGame:', err);
        });

        // 2. Reset UI State về trạng thái ban đầu
        this.isMicVisible = false;
        this.isReadingMode = false;  // Chưa vào chế độ đọc từng dòng
        this.hasListened = false;    // Chưa nghe bài đồng dao
        this.isRecordingSession = false;

        // Block loa cho đến khi intro-speak phát xong
        this.isSpeaking = true;

        // 3. UI Visuals - Reset về trạng thái ban đầu
        this.stopMicHintLoop();
        this.ui.microBtn.setAlpha(0);  // Ẩn mic
        this.showMascotIdle();
        this.lineMasks.showAllContent(); // Hiện toàn bộ nội dung (chưa che)

        // 4. Phát intro-speak (giống như khi mới vào game)
        playVoiceLocked(null, 'intro-speak');

        // Hiện ngón tay chỉ vào speaker
        this.time.delayedCall(500, () => {
            if (this.ui.speakerBtn && this.ui.speakerBtn.x > 0 && this.ui.speakerBtn.y > 0) {
                this.animateHandHintTo(this.ui.speakerBtn.x, this.ui.speakerBtn.y);
            }
        });

        // Cho phép ấn loa sau khi intro-speak phát xong
        const introDuration = AudioManager.getDuration('intro-speak') || 3;
        this.time.delayedCall((introDuration + 0.5) * 1000, () => {
            if (this.isGameActive) {
                this.isSpeaking = false;
                this.idleManager.start();
            }
        });
    }

    private showRetryPopup(message: string): void {
        this.speakUI.showSuccessPopup(this.ui.popup, this.ui.popupText, message);
        AudioManager.play('sfx-wrong');
    }

    private hidePopup(): void {
        this.speakUI.hidePopup(this.ui.popup, this.ui.popupText);
    }

    private nextScene(): void {
        // FIX: Dừng tất cả audio trước khi chuyển scene để tránh audio rác
        resetVoiceState();
        AudioManager.stopAll();

        // SDK: Lưu tiến trình và chuyển level
        sdk.requestSave({
            score: window.irukaGameState?.currentScore || 0,
            levelIndex: 1, // Chuyển sang màn 2 (Scene2)
        });
        sdk.progress({
            levelIndex: 1,
            total: 2,
            score: window.irukaGameState?.currentScore || 0,
        });

        this.scene.start(SceneKeys.Scene2);
    }

    // ========================================
    // PUBLIC METHODS
    // ========================================

    public restartIntro(): void {
        this.resetIdleState();
        this.idleManager.stop();
        this.hasListened = false;
        this.isMicVisible = false;
        this.isReadingMode = false;
        this.ui.microBtn.setAlpha(0);
        this.speakVoice?.destroy();
        this.lineMasks?.destroy();
        this.setupHelpers();
        this.initGameFlow();
    }
}