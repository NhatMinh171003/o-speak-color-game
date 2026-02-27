# Hướng dẫn thay Scene 1 bằng SpeakScene (Đọc thơ)

## Tổng quan
- **Dự án hiện tại (ex)**: Scene1 (Câu đố Cái Ô) → Scene2 (Tô màu bóng bay) → EndGame
- **Dự án nguồn (speak-matching-g-game)**: SpeakScene (Đọc thơ) → UnderlineScene → EndScene  
- **Mục tiêu**: Thay Scene1 hiện tại bằng SpeakScene → giữ Scene2 (tô màu) → EndGame

---

## Phân tích khác biệt 2 dự án

| Thành phần | Dự án hiện tại (ex) | Dự án nguồn |
|-----------|---------------------|--------------|
| Scene 1 | Scene1.ts (câu đố kéo thả) | SpeakScene.ts (đọc thơ + ghi âm) |
| Base class | Không có (extend Phaser.Scene) | SceneBase.ts (abstract, quản lý idle/hint) |
| SDK | Không có | @iruka-edu/mini-game-sdk |
| Voice | Không có | VoiceHandler.ts + SpeakVoice.ts |
| Animation | Không có | AnimationFactory.ts (spritesheet) |
| Assets | images/S1/* (ô, nấm, đèn) | images/SpeakScene/* + animation/* |
| Audio | Ít (sfx cơ bản) | Nhiều (prompt, score, sfx) |

---

## Các bước thực hiện

### Bước 1: Cài thêm dependencies
```bash
npm install @iruka-edu/mini-game-sdk
```
> **Lưu ý**: SpeakScene dùng SDK để ghi âm + chấm điểm phát âm. Nếu không có tài khoản SDK, cần mock/bỏ phần này.

### Bước 2: Copy files từ dự án nguồn

#### 2a. Scene files (tạo folder `src/scenes/speak/`)
```
src/scenes/speak/SpeakScene.ts
src/scenes/speak/SpeakUI.ts
src/scenes/speak/SpeakVoice.ts
src/scenes/speak/LineMaskManager.ts
src/scenes/speak/LineScoreManager.ts
src/scenes/speak/ReadingFinger.ts
```

#### 2b. Base class
```
src/scenes/SceneBase.ts
```

#### 2c. Utility files mới
```
src/utils/AnimationFactory.ts
src/utils/VoiceHandler.ts
src/utils/DebugGrid.ts
```

#### 2d. SDK client (nếu dùng SDK)
```
src/client-sdk/voice-session-client.ts
```

### Bước 3: Copy assets

#### 3a. Images
```bash
# Copy toàn bộ folder SpeakScene
cp -r speak-matching/.../images/SpeakScene/ → ex/public/assets/images/SpeakScene/
# Copy animation spritesheets
cp -r speak-matching/.../animation/ → ex/public/assets/animation/
```

#### 3b. Audio  
```bash
# Prompt audio (đọc thơ từng dòng)
cp speak-matching/.../audio/prompt/*.mp3 → ex/public/assets/audio/prompt/
# Score audio
cp -r speak-matching/.../audio/score/ → ex/public/assets/audio/score/
# SFX (bổ sung những cái chưa có)
cp speak-matching/.../audio/sfx/applause.mp3 → ex/public/assets/audio/sfx/
cp speak-matching/.../audio/sfx/fireworks.mp3 → ex/public/assets/audio/sfx/
```

### Bước 4: Cập nhật Keys.ts
- Thêm TextureKeys cho SpeakScene (banner, content, micro, speaker, mascot spritesheet...)
- Thêm AudioKeys mới (prompt, score)
- Đổi `SceneKeys.Scene1` → `SceneKeys.SpeakScene` hoặc giữ tên Scene1 nhưng trỏ tới SpeakScene

### Bước 5: Cập nhật PreloadScene.ts
- Xóa load assets Scene1 cũ (S1_* textures)  
- Thêm load assets SpeakScene (images, spritesheets, audio)

### Bước 6: Cập nhật GameConstants.ts
- Thêm config SPEAK_SCENE từ dự án nguồn (positions, timing, line reading config...)

### Bước 7: Cập nhật main.ts
- Import SpeakScene thay vì Scene1
- Thêm export `sdk`, `gameSDK` nếu dùng SDK
- Cập nhật scene array

### Bước 8: Sửa SpeakScene imports
- Đổi `SceneKeys.UnderlineScene` → `SceneKeys.Scene2` (chuyển sang tô màu thay vì gạch chân)
- Cập nhật paths cho imports phù hợp cấu trúc mới

---

## ⚠️ Vấn đề cần lưu ý

### SDK dependency
SpeakScene phụ thuộc nặng vào `@iruka-edu/mini-game-sdk` cho:
- Voice recording + scoring (chấm điểm phát âm)
- Game progress tracking
- Session management

**Nếu không có SDK**, cần:
1. Mock `sdk` và `gameSDK` trong main.ts
2. Bỏ/mock `voice.Submit()` trong LineScoreManager
3. Bỏ `configureSdkContext()` và `createPronunTracker()` trong SpeakScene

### SceneBase
SpeakScene kế thừa từ SceneBase (quản lý idle, hand hint, audio). Cần copy SceneBase.ts hoặc refactor.

### Flow chuyển scene
- Nguồn: SpeakScene → UnderlineScene → EndScene
- Đích: SpeakScene → Scene2 (tô màu) → EndGame
- Cần sửa `this.scene.start(SceneKeys.UnderlineScene)` → `this.scene.start(SceneKeys.Scene2)`
