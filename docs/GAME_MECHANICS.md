# 🎯 Game Mechanics

## 1. Gameplay

- **Scene1 – Chọn đồ vật đúng**: Trẻ nhìn banner hướng dẫn, chọn một trong ba đồ vật (một có `isCorrect = true`). Khi nhấn đúng, phát `sfx-ting`, thỏ đổi trạng thái, các vật phẩm khác bay lên, hiển thị popup victory và chuyển sang Scene2. Nhấn sai thì balloon rung và phát `sfx-wrong`.
- **Scene2 – Tô màu**: Trẻ chọn màu từ palette và vẽ trực tiếp lên các phần `RenderTexture` của teacher + chữ O. Mỗi phần đã khoanh vùng w/ `paintManager.createPaintableLayer`, chỉ chấp nhận stroke khi pointer di chuyển trên layer đó.
- **EndGameScene**: Khi toàn bộ phần tô hoàn thành, confetti + âm thanh success phát, có hai nút reset/exit để quay lại Scene1 hoặc thoát và gửi callback host.

## 2. Scoring

- Hiện chưa có scoreboard số học, tuy nhiên “điểm” được ngầm thể hiện bởi các hiệu ứng: `sfx-correct`, voice khen, popup victory khi người chơi làm đúng, và `sfx-ting` khi một phần trong Scene2 hoàn thành.
- Tất cả trạng thái thắng đều tied vào `finishedParts.size === totalParts` trong Scene2 (trong `handlePartComplete`). Khi đạt đủ phần, `AudioManager.play('sfx-correct')` rồi `scene.start(SceneKeys.EndGame)` sau delay nhỏ.

## 3. Win/Loss conditions

- **Win**: Chọn đúng đồ vật trong Scene1 và tô xong toàn bộ phần trong Scene2. Scene2 kiểm tra `unfinishedPartsMap` và size set `finishedParts`. Khi bằng `totalParts`, chuyển Scene đến EndGame.  
- **Loss**: Không có trạng thái thua “cuối cùng”; chọn sai chỉ trigger phản hồi âm thanh/tween mà không reset trò chơi hay giảm số mạng. Người chơi có thể thử lại ngay lập tức.  
- **Idle**: Nếu không tương tác đủ lâu, `IdleManager` sẽ show `handHint` để dẫn trẻ tới target đúng (Scene1) hoặc vùng cần tô (Scene2).

## 4. Logic spawn và setup

- **Scene1**: `createPuzzleItem()` đặt `umbrella`, `mushroom`, `lamp` tại các vị trí đã tính toán theo `GameUtils`. Các item `setData('isCorrect', true/false)` để kiểm tra nhanh. Toàn bộ sprite được tween float nhẹ và `pointerdown` gắn đến `handleWrong/handleCorrect`.
- **Scene2**: `level_s2_config.json` cung cấp các phần thầy/cô và chữ O cùng offset, scale, hint. `spawnCharacter()` tạo `RenderTexture` cho mỗi phần thông qua `PaintManager`, gắn thêm `hintX/hintY` để `showHint()` hướng tay. Palette colors (đỏ, vàng, xanh, tím, kem, đen) và `eraser` có anh highlight khi active.
- **Assets preload**: `PreloadScene` đảm nhiệm load hình/text/audio/data theo enums `TextureKeys`, `AudioKeys`, `DataKeys` để đảm bảo mỗi scene nhận đúng key mà không phải lặp lại đường dẫn.

---

**Ghi chú**: Nếu muốn thêm minigame mới, cập nhật `SceneKeys`, thêm scene vào config `main.ts`, nạp asset trong `PreloadScene`, và mở rộng `docs/ALGORITHMS.md` nếu thuật toán mới xuất hiện.
