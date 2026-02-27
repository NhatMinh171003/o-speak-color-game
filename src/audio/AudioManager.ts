import { Howl, Howler } from 'howler';

// 1. Định nghĩa Interface cho cấu hình âm thanh
interface SoundConfig {
    src: string;
    loop?: boolean;
    volume?: number;
}

//Đường dẫn gốc 
const BASE_PATH = 'assets/audio/';

// Ánh xạ ID âm thanh và cấu hình chi tiết
// NOTE: html5:true CHỈ dùng cho sounds phát SAU recording để tránh pool exhausted
const SOUND_MAP: Record<string, SoundConfig> = {

    // ---- SFX Chung (Web Audio - mặc định) ----
    'sfx-correct': { src: `${BASE_PATH}sfx/correct_answer.mp3`, volume: 1.0 },
    'sfx-correct_s2': { src: `${BASE_PATH}sfx/correct_color.mp3`, volume: 1.0 },
    'sfx-wrong': { src: `${BASE_PATH}sfx/wrong.mp3`, volume: 0.5 },
    'sfx-click': { src: `${BASE_PATH}sfx/click.mp3`, volume: 0.5 },
    'sfx-ting': { src: `${BASE_PATH}sfx/correct.mp3`, volume: 0.6 },

    // ---- Prompt Voice (Game D) ----
    'intro-speak': { src: `${BASE_PATH}prompt/IntroSpeak.mp3`, volume: 1.0 },
    'intro-voice': { src: `${BASE_PATH}prompt/IntroVoice.mp3`, volume: 1.0 },
    'voice-speaking': { src: `${BASE_PATH}prompt/Speak.mp3`, volume: 1.0 },
    'voice-rotate': { src: `${BASE_PATH}prompt/rotate.mp3`, volume: 1.0 },

    // ---- Line Prompts (phát SAU recording - dùng Web Audio với proper resume) ----
    'begin-line2': { src: `${BASE_PATH}prompt/begin_line2.mp3`, volume: 1.0 },
    'begin-line3': { src: `${BASE_PATH}prompt/begin_line3.mp3`, volume: 1.0 },
    'begin-line4': { src: `${BASE_PATH}prompt/begin_line4.mp3`, volume: 1.0 },
    'wait-grading': { src: `${BASE_PATH}prompt/wait_grading.mp3`, volume: 1.0 },

    // ---- Correct Answer Variations ----
    'complete': { src: `${BASE_PATH}sfx/complete.mp3`, volume: 1.0 },
    'fireworks': { src: `${BASE_PATH}sfx/fireworks.mp3`, volume: 1.0 },
    'applause': { src: `${BASE_PATH}sfx/applause.mp3`, volume: 1.0 },

    // ---- Score Audio (điểm 4-10) ----
    'score-4': { src: `${BASE_PATH}score/score_4.mp3`, volume: 1.0 },
    'score-5': { src: `${BASE_PATH}score/score_5.mp3`, volume: 1.0 },
    'score-6': { src: `${BASE_PATH}score/score_6.mp3`, volume: 1.0 },
    'score-7': { src: `${BASE_PATH}score/score_7.mp3`, volume: 1.0 },
    'score-8': { src: `${BASE_PATH}score/score_8.mp3`, volume: 1.0 },
    'score-9': { src: `${BASE_PATH}score/score_9.mp3`, volume: 1.0 },
    'score-10': { src: `${BASE_PATH}score/score_10.mp3`, volume: 1.0 },
};



class AudioManager {
    // Khai báo kiểu dữ liệu cho Map chứa các đối tượng Howl
    private sounds: Record<string, Howl> = {};
    private isLoaded: boolean = false;

    constructor() {
        // Cấu hình quan trọng cho iOS
        Howler.autoUnlock = true;
        Howler.volume(1.0);
    }

    /**
     * Tải tất cả âm thanh
     * @returns {Promise<void>}
     */
    loadAll(): Promise<void> {

        if (this.isLoaded) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const keys = Object.keys(SOUND_MAP);
            let loadedCount = 0;
            const total = keys.length;

            if (total === 0) {
                this.isLoaded = true;
                return resolve();
            }

            keys.forEach((key) => {
                const config = SOUND_MAP[key];

                this.sounds[key] = new Howl({
                    src: [config.src],
                    loop: config.loop || false,
                    volume: config.volume || 1.0,
                    // Dùng Web Audio API (default) - tránh HTML5 pool exhausted

                    onload: () => {
                        loadedCount++;
                        if (loadedCount === total) {
                            this.isLoaded = true;
                            resolve();
                        }
                    },
                    onloaderror: (id: number, error: unknown) => {
                        // Chúng ta vẫn có thể chuyển nó sang string để ghi log nếu muốn
                        const errorMessage =
                            error instanceof Error
                                ? error.message
                                : String(error);

                        console.error(
                            `[Howler Load Error] Key: ${key}, ID: ${id}, Msg: ${errorMessage}. Check file path: ${config.src}`
                        );

                        loadedCount++;
                        if (loadedCount === total) {
                            this.isLoaded = true;
                            resolve();
                        }
                    },
                });
            });
        });
    }

    /**
     * Phát một âm thanh
     * @param {string} id - ID âm thanh
     * @returns {number | undefined} - Sound ID của Howler
     */
    play(id: string): number | undefined {
        if (!this.isLoaded || !this.sounds[id]) {
            console.warn(
                `[AudioManager] Sound ID not found or not loaded: ${id}`
            );
            return;
        }

        // Ensure AudioContext is running (có thể bị suspended sau khi dùng mic)
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
            console.log('[AudioManager] play: Resuming suspended AudioContext');
            Howler.ctx.resume();
        }

        return this.sounds[id].play();
    }

    /**
     * Play ngay sau khi ghi âm xong, có fade-in để mask HTML5 audio startup gap.
     * iOS suspend <audio> elements trong khi mic hoạt động → cần re-buffer khi play lại
     * → sinh ra silent ~100-200ms ở đầu trên mobile thật. Fade-in che cái gap này.
     * 
     * NOTE: Nên dùng playAfterRecordingAsync() để đảm bảo restore audio trước khi play.
     */
    playAfterRecording(id: string, fadeInMs: number = 300): number | undefined {
        if (!this.isLoaded || !this.sounds[id]) {
            console.warn(`[AudioManager] Sound ID not found: ${id}`);
            return;
        }

        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        const isMobile = isIOS || isAndroid;

        // Mobile cần fade-in dài hơn để mask gap
        const actualFadeMs = isMobile ? Math.max(fadeInMs, 350) : fadeInMs;

        // Ensure AudioContext is running before playing
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
            console.log('[AudioManager] playAfterRecording: Resuming suspended AudioContext');
            Howler.ctx.resume();
        }

        const sound = this.sounds[id];
        const targetVolume = (sound as any)._volume ?? 1.0;

        console.log(`[AudioManager] playAfterRecording: ${id}, targetVol=${targetVolume}, fadeMs=${actualFadeMs}, mobile=${isMobile}`);

        // Set volume về 0, play ngay, rồi fade lên full
        sound.volume(0);
        const soundId = sound.play();
        sound.fade(0, targetVolume, actualFadeMs, soundId);

        // Safety fallback: nếu fade không hoạt động, đảm bảo volume được set sau fadeMs
        setTimeout(() => {
            if (sound.playing(soundId)) {
                sound.volume(targetVolume, soundId);
            }
        }, actualFadeMs + 50);

        return soundId;
    }

    /**
     * Play SAU khi ghi âm - ASYNC version.
     * Đảm bảo restore audio pipeline TRƯỚC khi play để tránh silent gap trên mobile thật.
     * Dùng khi có delay giữa recording stop và playback (ví dụ: chờ animation).
     */
    async playAfterRecordingAsync(id: string, fadeInMs: number = 300): Promise<number | undefined> {
        // Restore audio pipeline TRƯỚC khi play
        await this.restoreAudioAfterRecording();
        // Sau đó play với fade-in
        return this.playAfterRecording(id, fadeInMs);
    }

    /**
     * Dừng một âm thanh
     * @param {string} id - ID âm thanh
     */
    stop(id: string): void {
        if (!this.isLoaded || !this.sounds[id]) return;
        this.sounds[id].stop();
    }

    stopSound(id: string): void {
        if (this.sounds[id]) {
            this.sounds[id].stop();
        }
    }

    stopAll(): void {
        Howler.stop();
    }

    /**
     * Pause tất cả audio đang phát (dùng khi chuyển tab)
     */
    pauseAll(): void {
        Object.values(this.sounds).forEach(sound => {
            if (sound.playing()) {
                sound.pause();
            }
        });
    }

    /**
     * Resume tất cả audio đã bị pause (dùng khi quay lại tab)
     */
    resumeAll(): void {
        Object.values(this.sounds).forEach(sound => {
            // Howler tracks pause state internally
            // Calling play() on a paused sound will resume it
            if (sound.state() === 'loaded') {
                // Check if sound was paused (seek > 0 means it was playing)
                const seek = sound.seek();
                if (typeof seek === 'number' && seek > 0) {
                    sound.play();
                }
            }
        });
    }

    // Dừng TẤT CẢ các Prompt và Feedback 

    stopAllVoicePrompts(): void {
        const voiceKeys = Object.keys(SOUND_MAP).filter(
            (key) =>
                key.startsWith('prompt_') || key.startsWith('correct_answer_')
        );

        voiceKeys.forEach((key) => {
            this.stopSound(key);
        });

        // Hoặc dùng: Howler.stop(); để dừng TẤT CẢ âm thanh (thận trọng khi dùng)
    }

    // Kiểm tra nếu audio đã được unlock
    get isUnlocked(): boolean {
        return Howler.ctx && Howler.ctx.state === 'running';
    }

    /**
     * Đảm bảo AudioContext đang running
     * Cần gọi sau user gesture để resume context nếu bị suspended
     */
    async ensureContextRunning(): Promise<void> {
        if (!Howler.ctx) return;

        if (Howler.ctx.state === 'suspended') {
            console.log('[AudioManager] Resuming suspended AudioContext...');
            try {
                await Howler.ctx.resume();
                console.log('[AudioManager] AudioContext resumed successfully');
            } catch (e) {
                console.error('[AudioManager] Failed to resume AudioContext:', e);
            }
        }
    }

    unlockAudio(): void {
        if (!Howler.usingWebAudio) return;

        // Resume context nếu bị suspended
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
            Howler.ctx.resume();
        }

        // Tạo một âm thanh dummy và play/stop ngay lập tức
        const dummySound = new Howl({
            src: ['data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAAAAAA=='], // 1-frame silent WAV
            volume: 0,
        });
        dummySound.once('play', () => {
            dummySound.stop();
            console.log('[Howler] Audio context unlocked manually.');
        });

        // Chỉ play nếu context đang ở trạng thái suspended/locked
        if (Howler.ctx && Howler.ctx.state !== 'running') {
            dummySound.play();
        }
    }

    /**
     * Unlock audio và đợi cho đến khi AudioContext thực sự running
     * Dùng cho iOS/Safari để đảm bảo audio sẵn sàng trước khi phát
     */
    async unlockAudioAsync(): Promise<void> {
        if (!Howler.usingWebAudio) return;

        // Resume context nếu bị suspended
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
            console.log('[AudioManager] unlockAudioAsync: Resuming suspended context...');
            try {
                await Howler.ctx.resume();
                console.log('[AudioManager] unlockAudioAsync: Context resumed, state:', Howler.ctx.state);
            } catch (e) {
                console.warn('[AudioManager] unlockAudioAsync: Resume failed', e);
            }
        }

        // Nếu context đã running thì không cần play dummy sound
        if (Howler.ctx && Howler.ctx.state === 'running') {
            console.log('[AudioManager] unlockAudioAsync: Context already running');
            return;
        }

        // Fallback: phát silent sound để trigger unlock (cho Safari)
        return new Promise((resolve) => {
            const dummySound = new Howl({
                src: ['data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAAAAAA=='],
                volume: 0.001, // Không hoàn toàn 0 để trigger audio pipeline
                html5: false, // Web Audio API
                onplay: () => {
                    dummySound.stop();
                    dummySound.unload();
                    console.log('[AudioManager] unlockAudioAsync: Audio unlocked successfully');
                    setTimeout(resolve, 50);
                },
                onloaderror: () => {
                    console.warn('[AudioManager] unlockAudioAsync: Dummy sound load error');
                    dummySound.unload();
                    resolve();
                },
                onplayerror: () => {
                    console.warn('[AudioManager] unlockAudioAsync: Dummy sound play error');
                    dummySound.unload();
                    resolve();
                }
            });
            dummySound.play();

            // Timeout fallback nếu audio không phát được
            setTimeout(() => {
                console.warn('[AudioManager] unlockAudioAsync: Timeout, resolving anyway');
                resolve();
            }, 500);
        });
    }

    /**
     * Mobile/Safari Fix: Restore audio after microphone usage.
     * Mobile browsers duck (reduce) audio output when mic is active.
     * Must be AWAITED before playing any sound after recording stops.
     * 
     * Flow: resume AudioContext → wait for OS duck recovery → silent kick → done
     */
    async restoreAudioAfterRecording(): Promise<void> {
        try {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const isAndroid = /Android/.test(navigator.userAgent);
            const isMobile = isIOS || isAndroid;

            console.log(`[AudioManager] restoreAudio: starting... iOS=${isIOS}, Android=${isAndroid}`);

            // 1. Resume AudioContext nếu bị suspended
            if (Howler.ctx && Howler.ctx.state === 'suspended') {
                await Howler.ctx.resume();
                console.log('[AudioManager] restoreAudio: AudioContext resumed, state:', Howler.ctx.state);
            }

            // 2. Delay để OS un-duck audio routing
            // Mobile thật cần delay DÀI HƠN so với emulator
            const recoverMs = isIOS ? 250 : (isAndroid ? 150 : 50);
            console.log(`[AudioManager] restoreAudio: waiting ${recoverMs}ms for OS un-duck...`);
            await new Promise<void>(r => setTimeout(r, recoverMs));

            // 3. Silent kick để wake up audio pipeline
            // Mobile thật có thể cần sound dài hơn để fully restore
            await new Promise<void>((resolve) => {
                const silent = new Howl({
                    src: ['data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAAAAAA=='],
                    volume: 0.01, // Cao hơn chút để ensure audio pipeline active
                    html5: false, // Web Audio
                });
                silent.once('end', () => {
                    silent.unload();
                    resolve();
                });
                silent.once('playerror', () => {
                    silent.unload();
                    resolve();
                });
                silent.play();

                // Timeout fallback (silent sound quá ngắn có thể không trigger 'end')
                setTimeout(() => {
                    silent.unload();
                    resolve();
                }, 100);
            });

            // 4. Delay thêm cho mobile để hoàn toàn ổn định
            if (isMobile) {
                await new Promise<void>(r => setTimeout(r, 50));
            }

            console.log('[AudioManager] restoreAudio: done');
        } catch (e) {
            console.warn('[AudioManager] restoreAudio error:', e);
        }
    }

    public getDuration(key: string): number {
        const sound = this.sounds[key];

        if (sound) {
            // Howler trả về duration (giây). 
            // Cần đảm bảo file đã load xong (state 'loaded'), nếu không nó trả về 0.
            return sound.duration();
        }

        console.warn(`[AudioManager] Không tìm thấy duration cho key: "${key}"`);
        return 0; // Trả về 0 để an toàn
    }

    /**
     * Gọi callback khi sound kết thúc (chỉ 1 lần).
     * Dùng để đợi sound kết thúc trước khi thực hiện hành động tiếp theo.
     */
    onceEnd(key: string, cb: () => void): void {
        const sound = this.sounds[key];
        if (!sound) return;
        sound.once('end', cb);
    }
}

// Xuất phiên bản duy nhất (Singleton)
export default new AudioManager();