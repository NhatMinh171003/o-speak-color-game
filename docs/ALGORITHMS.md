# 🧮 ALGORITHMS & PROBLEM SOLVING

## 1. Vấn đề chính

Game này đặt ra các yêu cầu: (1) hướng dẫn trẻ chọn đúng đối tượng trong Scene1 bằng hiệu ứng trực quan, (2) xây hệ thống tô màu trong Scene2 mà vẫn đảm bảo phản hồi nhanh, (3) quản lý assets/âm thanh để không bị thiếu và restart mượt. Dưới đây là cách mình tiếp cận từng vấn đề bằng thuật toán đơn giản nhưng hiệu quả.

---

## 2. Scene1 — Kiểm tra lựa chọn & phản hồi

- **Kiểm tra đúng sai**: Mỗi `PuzzleItem` có `data('isCorrect')`. Khi người chơi nhấn (`pointerdown`), thuật toán chỉ cần đọc giá trị boolean: đúng → `handleCorrect`, sai → `handleWrong`. Không cần so sánh bằng số hay string nữa, nên tránh bug case sensitive.
- **Tween rung khi sai**: `handleWrong` tạo tween làm `angle` từ -10→10 lặp lại vài lần (repeat 3). Thuật toán đo thời gian vừa đủ để cố định điểm nhấn mà không làm dài dòng.
- **Disable tương tác sau khi đúng**: `handleCorrect` gọi `disableInteractive()` trên toàn `puzzleItems` để tránh click sai trong lúc tween đang chạy; sau đó kinds `tweens.killTweensOf(winnerItem)` để không bị xung đột tween cũ.
- **Chuỗi animation & delay**: Dùng `this.tweens.add` + `this.time.delayedCall` để lần lượt:
 1. Phóng to popup (`victoryBg`, `victoryText`).
 2. Dời `winnerItem` lên popup.
 3. Sau voice + `sfx-correct`, gọi `scene.start(SceneKeys.Scene2)`.

Thuật toán ở đây là biến sequence thành các callbacks được xếp trên queue (`onComplete`, `delayedCall`), không dùng loops cồng kềnh. Mỗi bước có check `if (this.isGameActive)` hoặc `if (!this.scene.isActive())` để tránh state race.

---

## 3. Scene2 — PaintManager & auto hint

- **PaintManager** quản lý `RenderTexture` và vùng tương tác (`createPaintableLayer`). Khi `pointerdown/move/up` xảy ra, PaintManager ghi điểm vào render texture, track `currentColor`.
- **Phân vùng hint**: Mỗi layer lưu `hintX`, `hintY`, `originScale`. `showHint()` giải thuật chọn random phần chưa tô (`unfinishedPartsMap`), tween alpha/scale rồi đặt `handHint` tại `hintX/hintY + offset`. Thuật toán này đảm bảo hint luôn trỏ được phần chưa hoàn thiện mà không cần data phức tạp.
- **Hoàn tất phần**: Khi `handlePartComplete` gọi callback, phần đó được `finishedParts.add(id)`. Nếu dùng đúng 1 màu (`usedColors.size === 1`) thì `rt.fill(color)` như auto-fill. Tween flash và `AudioManager.play('sfx-ting')`. Khi `finishedParts.size === totalParts`, gọi `scene.start(SceneKeys.EndGame)` sau delay.

Thuật toán này dùng set/map để track phần còn lại; không phải quét toàn bộ list mỗi frame mà chỉ update khi callback vẽ. Do đó hiệu suất tốt cho canvas lớn (độ phân giải 1920x1080).

---

## 4. IdleManager — phát hiện “im lặng”

- `IdleManager` giữ `threshold` (ms). Mỗi frame `update(delta)` tăng counter; mỗi lần pointer interaction reset counter về 0. Khi vượt threshold, callback hint được gọi và `isHintActive` cờ bật.
- Thuật toán tránh register pointer event ở nhiều chỗ bằng cách bắt mặc ở `Scene1` và `Scene2` gọi `this.input.on('pointerdown', ...)` để reset và stop intro.

---

## 5. Asset & Audio loading

- `PreloadScene` theo danh sách enum `TextureKeys`, `AudioKeys`, `DataKeys`. Các key giữ cấu trúc chuỗi cố định, không hardcode đường dẫn ở nơi khác. Thuật toán đảm bảo tất cả assets đều load trước khi chuyển scene.
- `AudioManager` cache sound object (`Map<string, Phaser.Sound.BaseSound>`). `play(key)` chỉ cần `if (this.sounds.has(key)) this.sounds.get(key)!.play()`. `loadAll()` trả về Promise, unlock audio trên mobile.

---

## 6. Kết luận

Thuật toán trong dự án chủ yếu là orchestration tween & audio sequence, tracking trạng thái dùng Set/Map, và có hệ thống hint idle để giữ trò chơi tương tác. Nếu bạn cần mô tả thêm cụ thể một đoạn function nào đó (ví dụ `PaintManager.handlePointerMove`), mình có thể mở rộng section tương ứng.
