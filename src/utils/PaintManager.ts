import Phaser from 'phaser';
import { GameConstants } from '../consts/GameConstants';

export class PaintManager {
    private scene: Phaser.Scene;

    // Config
    private brushColor: number = GameConstants.PAINT.DEFAULT_COLOR;
    private brushSize: number = GameConstants.PAINT.BRUSH_SIZE;
    private brushTexture: string = 'brush_circle';

    // State
    private isErasing: boolean = false;
    private activeRenderTexture: Phaser.GameObjects.RenderTexture | null = null;

    // ✅ FIX LAG: Biến lưu vị trí cũ để vẽ LERP
    private lastX: number = 0;
    private lastY: number = 0;

    // ✅ LOGIC MÀU: Map lưu danh sách màu đã dùng cho từng phần (Key: ID, Value: Set màu)
    private partColors: Map<string, Set<number>> = new Map();

    // ✅ TỐI ƯU RAM: Tạo sẵn Canvas tạm để tái sử dụng, không new mới liên tục
    private helperCanvasPaint: HTMLCanvasElement;
    private helperCanvasMask: HTMLCanvasElement;

    // Callback trả về cả Set màu thay vì 1 màu lẻ
    private onPartComplete: (id: string, rt: Phaser.GameObjects.RenderTexture, usedColors: Set<number>) => void;

    constructor(scene: Phaser.Scene, onComplete: (id: string, rt: Phaser.GameObjects.RenderTexture, usedColors: Set<number>) => void) {
        this.scene = scene;
        this.onPartComplete = onComplete;

        // Khởi tạo Canvas tạm 1 lần duy nhất
        this.helperCanvasPaint = document.createElement('canvas');
        this.helperCanvasMask = document.createElement('canvas');

        this.createBrushTexture();
    }

    private createBrushTexture() {
        if (!this.scene.textures.exists(this.brushTexture)) {
            const canvas = this.scene.textures.createCanvas(this.brushTexture, this.brushSize, this.brushSize);
            if (canvas) {
                const ctx = canvas.context;
                const grd = ctx.createRadialGradient(this.brushSize / 2, this.brushSize / 2, 0, this.brushSize / 2, this.brushSize / 2, this.brushSize / 2);
                grd.addColorStop(0, 'rgba(255, 255, 255, 1)');
                grd.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = grd;
                ctx.fillRect(0, 0, this.brushSize, this.brushSize);
                canvas.refresh();
            }
        }
    }

    public setColor(color: number) {
        this.isErasing = false;
        this.brushColor = color;
    }

    public setEraser() {
        this.isErasing = true;
    }

    public isPainting(): boolean {
        return this.activeRenderTexture !== null;
    }

    public createPaintableLayer(x: number, y: number, key: string, scale: number, uniqueId: string): Phaser.GameObjects.Image {
        const maskImage = this.scene.make.image({ x, y, key, add: false }).setScale(scale);
        const mask = maskImage.createBitmapMask();

        const rtW = maskImage.width * scale;
        const rtH = maskImage.height * scale;
        const rt = this.scene.add.renderTexture(x - rtW / 2, y - rtH / 2, rtW, rtH);

        rt.setOrigin(0, 0).setMask(mask).setDepth(10);
        rt.setData('id', uniqueId);
        rt.setData('key', key);
        rt.setData('isFinished', false);

        const hitArea = this.scene.add.image(x, y, key).setScale(scale).setAlpha(0.01).setDepth(50);

        // DEBUG: Hiện màu body để thấy vị trí từng part
        // hitArea.setAlpha(0.4).setTint(0xff0000 + 0.5 * 0xffff | 0);

        hitArea.setInteractive({ useHandCursor: true, pixelPerfect: true });

        hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.activeRenderTexture = rt;

            // ✅ QUAN TRỌNG: Lưu vị trí bắt đầu để tính toán LERP
            this.lastX = pointer.x - rt.x;
            this.lastY = pointer.y - rt.y;

            this.paint(pointer, rt);
        });

        return hitArea;
    }

    public handlePointerMove(pointer: Phaser.Input.Pointer) {
        if (pointer.isDown && this.activeRenderTexture) {
            this.paint(pointer, this.activeRenderTexture);
        }
    }

    public handlePointerUp() {
        if (this.isErasing) {
            this.activeRenderTexture = null;
            return;
        }
        if (this.activeRenderTexture) {
            this.checkProgress(this.activeRenderTexture);
            this.activeRenderTexture = null;
        }
    }

    // ✅ HÀM PAINT MỚI: DÙNG LERP ĐỂ VẼ MƯỢT
    private paint(pointer: Phaser.Input.Pointer, rt: Phaser.GameObjects.RenderTexture) {
        // 1. Lấy toạ độ hiện tại (Local)
        const currentX = pointer.x - rt.x;
        const currentY = pointer.y - rt.y;

        // 2. Tính khoảng cách
        const distance = Phaser.Math.Distance.Between(this.lastX, this.lastY, currentX, currentY);

        // Tối ưu: Nếu di chuyển quá ít (< 1px) thì bỏ qua
        if (distance < 1) return;

        // 3. Thuật toán LERP (Nội suy)
        const stepSize = this.brushSize / 4; // Mật độ vẽ
        const steps = Math.ceil(distance / stepSize);
        const offset = this.brushSize / 2;

        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            const interpX = this.lastX + (currentX - this.lastX) * t;
            const interpY = this.lastY + (currentY - this.lastY) * t;

            if (this.isErasing) {
                rt.erase(this.brushTexture, interpX - offset, interpY - offset);
            } else {
                rt.draw(this.brushTexture, interpX - offset, interpY - offset, 1.0, this.brushColor);
            }
        }

        // Vẽ chốt hạ tại điểm cuối
        if (this.isErasing) {
            rt.erase(this.brushTexture, currentX - offset, currentY - offset);
        } else {
            rt.draw(this.brushTexture, currentX - offset, currentY - offset, 1.0, this.brushColor);

            // ✅ LOGIC LƯU MÀU: Thêm màu hiện tại vào danh sách
            const id = rt.getData('id');
            if (!this.partColors.has(id)) {
                this.partColors.set(id, new Set());
            }
            this.partColors.get(id)?.add(this.brushColor);
        }

        // 4. Cập nhật vị trí cũ
        this.lastX = currentX;
        this.lastY = currentY;
    }

    // ✅ HÀM CHECK PROGRESS MỚI: TỐI ƯU BỘ NHỚ
    private checkProgress(rt: Phaser.GameObjects.RenderTexture) {
        if (rt.getData('isFinished')) return;

        const id = rt.getData('id');
        const key = rt.getData('key');

        rt.snapshot((snapshot) => {
            if (!(snapshot instanceof HTMLImageElement)) return;

            const w = snapshot.width;
            const h = snapshot.height;
            const checkW = Math.floor(w / 4);
            const checkH = Math.floor(h / 4);

            // ✅ TÁI SỬ DỤNG CANVAS (Không tạo mới)
            const ctxPaint = this.getRecycledContext(this.helperCanvasPaint, snapshot, checkW, checkH);
            const sourceImg = this.scene.textures.get(key).getSourceImage() as HTMLImageElement;
            const ctxMask = this.getRecycledContext(this.helperCanvasMask, sourceImg, checkW, checkH);

            if (!ctxPaint || !ctxMask) return;

            const paintData = ctxPaint.getImageData(0, 0, checkW, checkH).data;
            const maskData = ctxMask.getImageData(0, 0, checkW, checkH).data;

            let match = 0;
            let total = 0;

            // Thuật toán đếm Pixel (Giữ nguyên logic của bạn)
            for (let i = 3; i < paintData.length; i += 4) {
                if (maskData[i] > 0) { // Nếu pixel thuộc vùng mask
                    total++;
                    if (paintData[i] > 0) match++; // Nếu đã được tô
                }
            }

            const percentage = total > 0 ? match / total : 0;

            if (percentage > GameConstants.PAINT.WIN_PERCENT) {
                rt.setData('isFinished', true);

                // ✅ GỬI DANH SÁCH MÀU VỀ SCENE
                const usedColors = this.partColors.get(id) || new Set([this.brushColor]);
                this.onPartComplete(id, rt, usedColors);

                // Clear bộ nhớ màu của phần này cho nhẹ
                this.partColors.delete(id);
            }
        });
    }

    // Hàm helper để tái sử dụng Context
    private getRecycledContext(canvas: HTMLCanvasElement, img: HTMLImageElement, w: number, h: number) {
        canvas.width = w; // Set lại width tự động clear nội dung cũ
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, w, h); // Clear chắc chắn lần nữa
            ctx.drawImage(img, 0, 0, w, h);
        }
        return ctx;
    }
}