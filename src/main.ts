import Phaser from 'phaser';
import SpeakScene from './scenes/speak/SpeakScene';
import Scene2 from './scenes/Scene2';
import PreloadScene from './scenes/PreloadScene';

import EndGameScene from './scenes/EndgameScene';
import { initRotateOrientation } from './utils/rotateOrientation';
import AudioManager from './audio/AudioManager';
import { game as gameSDK } from '@iruka-edu/mini-game-sdk';
import { SceneKeys } from './consts/Keys';

declare global {
    interface Window {
        gameScene: any;
        irukaHost: any;
        irukaGameState: any;
    }
}

// --- CẤU HÌNH GAME (Theo cấu trúc mẫu: FIT) ---
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    parent: 'game-container',
    scene: [PreloadScene, SpeakScene, Scene2, EndGameScene],
    backgroundColor: '#ffffff',
    scale: {
        mode: Phaser.Scale.FIT,       // Dùng FIT để co giãn giữ tỉ lệ
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    },
    render: {
        transparent: true,
    },
};

const gamePhaser = new Phaser.Game(config);

// --- SDK INTEGRATION ---
function getHubOrigin(): string {
    try {
        const params = new URLSearchParams(window.location.search);
        const origin = params.get('hubOrigin');
        if (origin) return origin;
    } catch { }
    return '*';
}

export const sdk = gameSDK.createGameSdk({
    hubOrigin: getHubOrigin(),

    onInit(_ctx) {
        sdk.ready({
            capabilities: ['resize', 'score', 'complete', 'save_load', 'set_state', 'stats', 'hint'],
        });
    },

    onStart() {
        gamePhaser.scene.resume(SceneKeys.SpeakScene);
        gamePhaser.scene.resume(SceneKeys.Scene2);
        gamePhaser.scene.resume(SceneKeys.EndGame);
    },

    onPause() {
        gamePhaser.scene.pause(SceneKeys.SpeakScene);
        gamePhaser.scene.pause(SceneKeys.Scene2);
    },

    onResume() {
        gamePhaser.scene.resume(SceneKeys.SpeakScene);
        gamePhaser.scene.resume(SceneKeys.Scene2);
    },

    onQuit() {
        gameSDK.finalizeAttempt('quit');
        sdk.complete({
            timeMs: Date.now() - (window.irukaGameState?.startTime ?? Date.now()),
            extras: { reason: 'hub_quit', stats: gameSDK.prepareSubmitData() },
        });
    },
});

export { gameSDK };

// --- 2. XỬ LÝ LOGIC UI & XOAY MÀN HÌNH (Giữ nguyên logic cũ của bạn) ---
function updateUIButtonScale() {
    //const container = document.getElementById('game-container')!;
    const resetBtn = document.getElementById('btn-reset') as HTMLImageElement;
    if (!resetBtn) return; // Thêm check null cho an toàn

    const w = window.innerWidth;
    const h = window.innerHeight;

    const scale = Math.min(w, h) / 1080;
    const baseSize = 100;
    const newSize = baseSize * scale;

    resetBtn.style.width = `${newSize}px`;
    resetBtn.style.height = 'auto';
}

export function showGameButtons() {
    const reset = document.getElementById('btn-reset');
    if (reset) reset.style.display = 'block';
}

export function hideGameButtons() {
    const reset = document.getElementById('btn-reset');
    if (reset) reset.style.display = 'none';
}

function attachResetHandler() {
    const resetBtn = document.getElementById('btn-reset') as HTMLImageElement;

    if (resetBtn) {
        resetBtn.onclick = () => {
            console.log('Restart button clicked. Stopping all audio and restarting scene.');

            //gamePhaser.sound.stopAll();
            gamePhaser.sound.stopByKey('bgm-nen');
            AudioManager.stopAll();
            // 2. PHÁT SFX CLIC
            try {
                AudioManager.play('sfx-click');
            } catch (e) {
                console.error("Error playing sfx-click on restart:", e);
            }

            if (window.gameScene && window.gameScene.scene) {
                window.gameScene.scene.stop();
                window.gameScene.scene.start('SpeakScene');
            } else {
                console.error('GameScene instance not found on window. Cannot restart.');
            }

            hideGameButtons();
        };
    }
}

// Khởi tạo xoay màn hình
initRotateOrientation(gamePhaser);
attachResetHandler();

// Scale nút
updateUIButtonScale();
window.addEventListener('resize', updateUIButtonScale);
window.addEventListener('orientationchange', updateUIButtonScale);

document.getElementById('btn-reset')?.addEventListener('sfx-click', () => {

    window.gameScene?.scene.restart();
});