# 🛠️ Development Guide

## 1. Project Structure

```
puzzles-colors-o-game/
├── public/                        # Assets tĩnh (images, audio, json data)
│   └── assets/
│       ├── images/S1, S2, ui, bg  # Hình Scene1, Scene2 và UI chung
│       ├── audio/                  # Nhạc nền + SFX/voice
│       └── data/level_s2_config.json # Config phần tô màu
├── src/
│   ├── scenes/                     # Các Scene chính (Preload, Scene1, Scene2, EndGame)
│   ├── audio/                      # `AudioManager` và danh sách key
│   ├── consts/                     # `SceneKeys`, `TextureKeys`, `AudioKeys`, `DataKeys`
│   ├── utils/                      # BackgroundManager, GameUtils, IdleManager, PaintManager, rotateOrientation
│   └── main.ts                     # Khởi tạo Phaser Game + reset button handler
├── docs/                           # Documentation bổ trợ (đã có Implementation/Algorithms/Game Mechanics/Development)
├── package.json + package-lock.json# Scripts & dependencies
└── vite.config.ts                  # cấu hình assetsInclude cho png/jpg/mp3/json
```

## 2. Quy tắc đóng góp

1. **Mở issue trước** khi làm task lớn để tránh trùng lặp và đồng bộ với roadmap.  
2. **Branch theo feature**: `feature/<mô-tả>`, `fix/<mô-tả>`; rebase giữ lịch sử sạch nếu cần.  
3. **Tuân thủ style**: giữ TypeScript strict, không dùng `any` với key (dùng `TextureKeys`, `SceneKeys`), đặt tên rõ ràng cho tween/timer.  
4. **Viết test nhỏ** (unit hoặc visual test function) khi thay đổi helper như `GameUtils`, `PaintManager`, `IdleManager`.  
5. **PR tiêu chuẩn**: mô tả rõ nội dung, steps để reproduce, mention issue; sau review, squash nếu commit lẻ tẻ.  
6. **Cập nhật tài liệu** (`README.md`, `docs/*`) nếu thay đổi flow game, palette, hoặc tab asset.  
7. **Kiểm tra asset mới**: thêm entry `TextureKeys`/`AudioKeys`/`DataKeys`, load trong `PreloadScene`, và thêm asset thực tế vào `public/assets`.

## 3. Build & Deployment

- **Dev**: `npm run dev` (Vite dev server). Gợi ý thêm `--host 0.0.0.0` khi cần test trên thiết bị khác.  
- **Production build**: `npm run build`. Kiểm tra `dist/` hoặc `preview` để đảm baảo asset được inline.  
- **Preview**: `npm run preview` để kiểm tra bản build local (phục vụ QA).  
- **Lưu ý deployment**: Xuất ra các file trong `dist/`, đảm bảo `public/assets` copy đúng; `btn-exit` cần gọi callback host (Iruka) nếu nhúng vào hệ sinh thái lớn.  
- **Release**: Tag phiên bản nếu thêm tính năng mới, ghi chú thay đổi liên quan tới gameplay và audio.

---

Luôn chạy `npm run lint`/`npm run test` (nếu có) trước khi submit PR, và giữ `node_modules` ngoài commit. Nếu cần script hỗ trợ đóng gói thêm (ví dụ `scripts/deploy.sh`), hãy đặt trong thư mục `scripts/` và cập nhật README/DEVELOPMENT để người khác biết.
