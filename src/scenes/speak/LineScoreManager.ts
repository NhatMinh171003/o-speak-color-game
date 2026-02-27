/**
 * LineScoreManager - Quản lý async API scoring cho từng dòng
 * 
 * Logic:
 * - Sử dụng SDK voice.Submit để gửi audio
 * - Gọi API bất đồng bộ sau mỗi dòng đọc xong
 * - Không blocking - bé có thể đọc dòng tiếp ngay
 * - Khi đọc xong dòng cuối, chờ tất cả API hoàn thành
 * - Tính điểm trung bình các dòng, làm tròn chuẩn
 */
import { GameConstants } from '../../consts/GameConstants';
import { voice } from '@iruka-edu/mini-game-sdk';

// ExerciseType enum - use the value directly for NURSERY_RHYME
const EXERCISE_TYPE_NURSERY_RHYME = 'NURSERY_RHYME';

export interface LineScoreResult {
    score: number;
    status: string;
    transcript?: string;
    latency_seconds?: number;
}

export interface LineScoreManagerConfig {
    testmode?: boolean;
}

export class LineScoreManager {
    private scores: (number | null)[] = [];
    private pendingPromises: Promise<LineScoreResult | null>[] = [];
    private abortControllers: Map<number, AbortController> = new Map();
    private currentAttemptId: number = 0;
    private config: LineScoreManagerConfig;

    constructor(config?: LineScoreManagerConfig) {
        this.config = config || { testmode: true };
        this.reset();
    }

    /**
     * Reset để bắt đầu session mới
     */
    reset(): void {
        const total = GameConstants.SPEAK_SCENE.LINE_READING.TOTAL_LINES;
        
        // Hủy tất cả requests đang chạy
        this.abortControllers.forEach((controller) => {
            controller.abort();
        });
        this.abortControllers.clear();
        
        // Tăng attemptId để ignore callbacks từ attempt cũ
        this.currentAttemptId++;
        
        this.scores = new Array(total).fill(null);
        this.pendingPromises = [];
    }

    /**
     * Gửi audio để chấm điểm 1 dòng (async, không blocking)
     * Sử dụng voice.Submit từ SDK
     * @param lineIndex - Index của dòng (0-based)
     * @param audioBlob - Audio blob đã ghi âm
     * @param durationMs - Thời gian ghi âm (ms)
     * @returns Promise<LineScoreResult | null>
     */
    submitLineScore(lineIndex: number, audioBlob: Blob, durationMs?: number): Promise<LineScoreResult | null> {
        const targetText = GameConstants.SPEAK_SCENE.LINE_READING.KEYWORDS_PER_LINE[lineIndex];
        const actualDuration = durationMs || 3000;
        const attemptId = this.currentAttemptId;

        // Tạo AbortController
        const abortController = new AbortController();
        this.abortControllers.set(lineIndex, abortController);

        console.log(`[LineScoreManager] Submitting line ${lineIndex + 1}, text: "${targetText}"`);
        console.log(`[LineScoreManager] Audio size: ${audioBlob.size} bytes, duration: ${actualDuration}ms`);

        const startTime = performance.now();

        // Convert audio blob to File
        const audioFile = new File([audioBlob], `line_${lineIndex + 1}.wav`, {
            type: 'audio/wav',
        });

        // Format targetText cho NURSERY_RHYME type
        const targetTextObj = {
            text: targetText,
        };

        // Gọi voice.Submit từ SDK
        const promise = voice.Submit({
            audioFile: audioFile,
            questionIndex: lineIndex + 1, // API dùng 1-based index
            targetText: targetTextObj,
            durationMs: actualDuration,
            exerciseType: EXERCISE_TYPE_NURSERY_RHYME as any, // SDK ExerciseType
            testmode: this.config.testmode ?? true,
        })
            .then((result) => {
                // Kiểm tra: Nếu attempt đã thay đổi, ignore callback này
                if (attemptId !== this.currentAttemptId) {
                    console.log(`[LineScoreManager] Ignoring old callback for line ${lineIndex + 1}`);
                    return null;
                }

                const latency = performance.now() - startTime;
                console.log(`[LineScoreManager] Line ${lineIndex + 1} scored in ${latency.toFixed(0)}ms: ${result.score}`);

                // Lưu điểm (API trả về 0-100)
                this.scores[lineIndex] = result.score ?? 0;
                this.abortControllers.delete(lineIndex);
                
                return {
                    status: result.score >= 60 ? 'good' : result.score >= 40 ? 'almost' : 'retry',
                    score: result.score ?? 0,
                    transcript: result.feedback || '',
                    latency_seconds: latency / 1000,
                } as LineScoreResult;
            })
            .catch((err) => {
                // Kiểm tra: Nếu attempt đã thay đổi, ignore error này
                if (attemptId !== this.currentAttemptId) {
                    console.log(`[LineScoreManager] Ignoring old error for line ${lineIndex + 1}`);
                    return null;
                }

                // Nếu bị abort, không set score
                if (err.name === 'AbortError' || err.message?.includes('aborted')) {
                    console.log(`[LineScoreManager] Line ${lineIndex + 1} request aborted`);
                    return null;
                }

                const latency = performance.now() - startTime;
                console.error(`[LineScoreManager] Line ${lineIndex + 1} error after ${latency.toFixed(0)}ms:`, err);

                this.scores[lineIndex] = 0;
                this.abortControllers.delete(lineIndex);
                
                return {
                    status: 'retry',
                    score: 0,
                    transcript: '',
                    latency_seconds: latency / 1000,
                } as LineScoreResult;
            });

        this.pendingPromises.push(promise);
        return promise;
    }

    /**
     * Chờ tất cả API hoàn thành và trả về điểm trung bình (hệ 10, làm tròn chuẩn)
     * @returns Promise<number> - Điểm cuối cùng (4-10)
     */
    async getFinalScore(): Promise<number> {
        console.log('[LineScoreManager] Waiting for all scores...');

        // Chờ tất cả promises (null results từ old attempts hoặc aborted requests sẽ bị ignore)
        await Promise.all(this.pendingPromises);

        // Tính trung bình (hệ 100)
        const validScores = this.scores.filter((s): s is number => s !== null);

        if (validScores.length === 0) {
            console.warn('[LineScoreManager] No valid scores, returning MIN_SCORE');
            return GameConstants.VOICE_RECORDING.MIN_SCORE;
        }

        const sum = validScores.reduce((a, b) => a + b, 0);
        const avg100 = sum / validScores.length;

        // Chuyển từ hệ 100 sang hệ 10
        const avg10 = avg100 / 10;

        // Làm tròn chuẩn (6.3 → 6, 6.5 → 7)
        const rounded = Math.round(avg10);

        // Clamp giữa MIN_SCORE và 10
        const CFG = GameConstants.VOICE_RECORDING;
        const finalScore = Math.max(CFG.MIN_SCORE, Math.min(10, rounded));

        console.log(`[LineScoreManager] API avg: ${avg100.toFixed(2)}% → ${avg10.toFixed(2)}/10 → rounded: ${finalScore}/10`);
        console.log(`[LineScoreManager] Individual scores:`, this.scores);

        return finalScore;
    }

    /**
     * Getter: số dòng đã được chấm điểm
     */
    get scoredCount(): number {
        return this.scores.filter(s => s !== null).length;
    }

    /**
     * Getter: mảng điểm hiện tại (để debug)
     */
    get currentScores(): (number | null)[] {
        return [...this.scores];
    }
}
