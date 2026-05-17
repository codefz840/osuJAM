// ==========================================
// 1. 設定與全域變數
// ==========================================

// 【預設值 — 可透過 Tosu 設定面板即時調整】-----------------

// 圖片檔名格式，% 會被替換成數字 (0, 1, 2, ...)
// 設定 ID: ImageFormat
let imageFormat = "gif-%.png";

// 動畫的總幀數 (圖片總張數)
// 設定 ID: ImageCount
let imageCount = 55;

// 每一拍的起始幀編號陣列 (關鍵幀映射)
// ★ 單一元素模式：[0]  ★ 多元素模式：[0, 8, 16, ...]
// 設定 ID: ImageKey (逗號分隔字串，例如 "0,8,16,24,32,40,48,56,64,72")
let imageKey = [0, 14, 28, 41, 54];

// -------------------------------------------------------

// 時間偏移 (ms)，可透過 Tosu 設定面板或 +/- 快捷鍵調整
// 設定 ID: UserOffset
let userOffset = 0;

// 節拍細分設定：可透過 Tosu 設定面板或 [/] 快捷鍵調整
// 1/1 = 每一拍一段 (循環段) → 基準速度
// 1/2 = 每半拍一段 → 較快
// 1/4 = 每 1/4 拍一段 → 更快
// 設定 ID: SnapDivisor
const SNAP_OPTIONS = [1, 2, 3, 4, 6, 8];
let snapDivisor = 1;

const images = [];          
let allTimingPoints = [];   
let currentImgElement = document.getElementById("jam"); 
let debugEl = document.getElementById("debug");

// --- Debug 顯示控制與鍵盤監聽 ---
if (debugEl) {
    debugEl.style.display = "none"; // 默認隱藏
    debugEl.style.position = "absolute";
    debugEl.style.top = "200";
    debugEl.style.left = "0";
    // 修改：背景顏色加深，確保能擋住圖片
    debugEl.style.background = "rgba(0, 0, 0, 0.7)"; 
    debugEl.style.color = "#fff";
    debugEl.style.padding = "10px";
    debugEl.style.fontFamily = "monospace";
    debugEl.style.fontSize = "14px";
    // 修改：Z-Index 確保在最上層
    debugEl.style.zIndex = "99999";
    debugEl.style.pointerEvents = "none"; // 讓滑鼠點擊穿透 (不影響操作，但視覺上擋住)
    debugEl.style.borderRadius = "0 0 5px 0";
}

window.addEventListener("keydown", (e) => {
    // 1. 切換 Debug 顯示 (按 d 或 D)
    if ((e.key === "d" || e.key === "D") && debugEl) {
        if (debugEl.style.display === "none") {
            debugEl.style.display = "block";
        } else {
            debugEl.style.display = "none";
        }
    }

    // 2. 調整 Offset (按 + 或 -)
    // 修改：每次微調 1ms
    if (e.key === "+" || e.key === "=" || e.key === "Add") {
        userOffset += 1; 
        console.log(`Offset adjusted: ${userOffset}ms`);
    }

    if (e.key === "-" || e.key === "_" || e.key === "Subtract") {
        userOffset -= 1; 
        console.log(`Offset adjusted: ${userOffset}ms`);
    }

    // 3. 調整節拍細分 (按 [ 減小 / 按 ] 增大)
    if (e.key === "[" || e.key === "{") {
        const idx = SNAP_OPTIONS.indexOf(snapDivisor);
        if (idx > 0) {
            snapDivisor = SNAP_OPTIONS[idx - 1];
            console.log(`Snap adjusted: 1/${snapDivisor}`);
        }
    }

    if (e.key === "]" || e.key === "}") {
        const idx = SNAP_OPTIONS.indexOf(snapDivisor);
        if (idx < SNAP_OPTIONS.length - 1) {
            snapDivisor = SNAP_OPTIONS[idx + 1];
            console.log(`Snap adjusted: 1/${snapDivisor}`);
        }
    }
});

let currentOsuData = null;
let lastBeatmap = "";       

// --- 時間同步與 FPS 相關變數 ---
let serverTimeRef = 0;      
let localTimeRef = 0;
let isPaused = false;       

// 渲染效能 FPS
let frameCount = 0;
let lastFpsTime = performance.now();
let renderFPS = 0;

// ==========================================
// 2. 初始化與圖片預載
// ==========================================
function reloadImages() {
    images.length = 0;
    for (let i = 0; i < imageCount; i++) {
        const image = new Image();
        image.src = `./images/${imageFormat.replace("%", i)}`;
        images.push(image);
    }
    if (images.length > 0) renderFrame(0);
    console.log(`圖片載入: ${imageCount} 張, 格式: ${imageFormat}`);
}

function preLoadImages() {
    console.log("開始預載圖片...");
    reloadImages();
}
preLoadImages();

// ==========================================
// 3. 設定管理 (Settings)
// ==========================================
// 接收並套用從 Tosu 設定面板傳入的設定值
// ImageFormat / ImageCount / ImageKey 變更時會自動重新載入圖片
function applySettings(msg) {
    if (!msg || typeof msg !== 'object') return;
    let needsReload = false;

    if (msg.ImageFormat !== undefined) {
        const fmt = String(msg.ImageFormat);
        if (fmt !== imageFormat) { imageFormat = fmt; needsReload = true; }
    }
    if (msg.ImageCount !== undefined) {
        const count = parseInt(msg.ImageCount);
        if (!isNaN(count) && count > 0 && count !== imageCount) {
            imageCount = count;
            needsReload = true;
        }
    }
    if (msg.ImageKey !== undefined) {
        const parsed = String(msg.ImageKey)
            .split(',')
            .map(s => parseInt(s.trim()))
            .filter(n => !isNaN(n));
        if (parsed.length > 0) imageKey = parsed;
    }
    if (msg.UserOffset !== undefined) {
        const offset = parseInt(msg.UserOffset);
        if (!isNaN(offset)) userOffset = offset;
    }
    if (msg.SnapDivisor !== undefined) {
        const snap = parseInt(msg.SnapDivisor);
        if (SNAP_OPTIONS.includes(snap)) snapDivisor = snap;
    }

    if (needsReload) reloadImages();
    console.log("設定已更新:", msg);
}

// ==========================================
// 4. WebSocket 連接
// ==========================================
// 透過 WebSocket 接收 Tosu/gosumemory 即時推送的 osu! 遊戲狀態
// 包含目前播放時間、BPM、譜面資訊等

// 設定用 WebSocket：連接 /websocket/commands 端點取得覆蓋層設定
function fetchSettings() {
    if (!window.COUNTER_PATH) return;
    const socket = new WebSocket(
        `ws://127.0.0.1:24050/websocket/commands?l=${window.COUNTER_PATH}`
    );

    socket.onopen = () => {
        console.log("Settings WebSocket 已連接");
        socket.send(`getSettings:${encodeURI(window.COUNTER_PATH)}`);
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.command === "getSettings") {
                applySettings(data.message);
                socket.close();
            }
        } catch (err) {
            console.error("Settings WS Error:", err);
        }
    };

    socket.onerror = () => socket.close();
}

window.addEventListener("load", fetchSettings);

// 遊戲狀態用 WebSocket：連接 /ws 端點接收即時遊戲資料
function connectWebSocket() {
    const socket = new WebSocket("ws://127.0.0.1:24050/ws");

    socket.onopen = () => {
        console.log("WebSocket 已連接");
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (!data?.menu?.bm) return;
            currentOsuData = data;

            // 1. 偵測切歌
            const currentBeatmap = data.menu.bm.path?.file;
            if (currentBeatmap && currentBeatmap !== lastBeatmap) {
                console.log("偵測到切歌:", currentBeatmap);
                lastBeatmap = currentBeatmap;
                loadCurrentBeatmapFile();
            }

            // 2. 暫停判斷
            const newTime = data.menu.bm.time.current;
            if (newTime === serverTimeRef) {
                isPaused = true;
            } else {
                isPaused = false;
            }

            // 3. 更新基準時間
            serverTimeRef = newTime;
            localTimeRef = performance.now();

        } catch (err) {
            console.error("WS Error:", err);
        }
    };

    socket.onclose = () => setTimeout(connectWebSocket, 3000);
    socket.onerror = (err) => socket.close();
}

connectWebSocket();

// ==========================================
// 5. 動畫渲染循環
// ==========================================
// 每次螢幕刷新都會呼叫一次 (約 60fps 或更高)
// 核心流程：計算目前播放時間 → 找到對應的 Timing Point → 算出幀索引 → 切換圖片
function gameLoop() {
    const now = performance.now();

    // --- 計算 渲染 FPS ---
    frameCount++;
    if (now - lastFpsTime >= 1000) {
        renderFPS = frameCount;
        frameCount = 0;
        lastFpsTime = now;
    }

    if (images.length > 0) {
        
        let displayTime = 0;

        // 時間計算
        if (isPaused) {
            displayTime = serverTimeRef + userOffset;
        } else {
            const timePassed = now - localTimeRef;
            displayTime = serverTimeRef + timePassed + userOffset;
        }

        // 取得 Timing Context
        const { current: activeTP, next: nextTP } = getTimingContext(displayTime);
        
        // --- Debug 資訊顯示 ---
        if (debugEl && debugEl.style.display !== "none" && activeTP) {
            const realBPM = currentOsuData?.menu?.bm?.stats?.BPM?.realtime || 0;
            const commonBPM = currentOsuData?.menu?.bm?.stats?.BPM?.common;
            const currentTPBPM = Math.round(60000 / activeTP.beatLength);
            const baseBPM = commonBPM || currentTPBPM;

            const nextTPTime = nextTP ? Math.floor(nextTP.time) : "None";
            const nextTPBpm = nextTP ? Math.round(60000 / nextTP.beatLength) : "-";

            debugEl.innerHTML = `
                Offset: <b>${userOffset}ms</b> (Press +/-)<br>
                Snap: <b>1/${snapDivisor}</b> (Press [/])<br>
                Time: <b>${Math.floor(displayTime)}</b> ms<br>
                Render FPS: <b>${renderFPS}</b><br>
                <br>
                BPM: <b>${realBPM}</b> (Real) / <b>${baseBPM}</b> (Base)<br>
                <br>
                Current TP: Time <b>${Math.floor(activeTP.time)}</b> (Section BPM: ${currentTPBPM})<br>
                Next TP: Time <b>${nextTPTime}</b> (BPM ${nextTPBpm})<br>
                Total TPs: <b>${allTimingPoints.length}</b>
            `;
        }
        
        // 計算並繪製
        const frameIndex = calculateFrameIndex(displayTime, activeTP);
        renderFrame(frameIndex);
    }

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

// ==========================================
// 6. 檔案讀取 (維持不變)
// ==========================================

async function loadCurrentBeatmapFile() {
    try {
        const resp = await fetch("http://127.0.0.1:24050/files/beatmap/file"); 
        const text = await resp.text();
        allTimingPoints = parseOsuTimingPoints(text);
        console.log("BPM 表更新:", allTimingPoints.length);
    } catch (e) {
        console.error("讀取 .osu 失敗:", e);
    }
}

function parseOsuTimingPoints(osuFileContent) {
    const lines = osuFileContent.split(/\r?\n/);
    let inTimingSection = false;
    const points = [];

    for (let line of lines) {
        line = line.trim();
        if (line === '[TimingPoints]') { inTimingSection = true; continue; }
        if (inTimingSection && line.startsWith('[')) break;
        if (inTimingSection && line.length > 0) {
            const parts = line.split(',');
            if (parts.length >= 2) {
                const time = parseFloat(parts[0]);
                const beatLength = parseFloat(parts[1]);
                const uninherited = parts.length >= 7 ? parseInt(parts[6]) : 1;
                if (uninherited === 1) points.push({ time, beatLength });
            }
        }
    }
    return points.sort((a, b) => a.time - b.time);
}

// ==========================================
// 7. 計算邏輯
// ==========================================

// 根據目前播放時間，找出對應的 Timing Point (紅線)
// 回傳 current (目前生效的 TP) 與 next (下一個 TP，用於 Debug 顯示)
function getTimingContext(currentTime) {
    if (!allTimingPoints || allTimingPoints.length === 0) {
        return { current: { time: 0, beatLength: 500 }, next: null };
    }

    let current = allTimingPoints[0];
    let next = null;

    if (currentTime >= current.time) {
        for (let i = 0; i < allTimingPoints.length; i++) {
            if (currentTime >= allTimingPoints[i].time) {
                current = allTimingPoints[i];
                next = (i + 1 < allTimingPoints.length) ? allTimingPoints[i + 1] : null;
            } else {
                break;
            }
        }
    } else {
        next = allTimingPoints[0];
    }
    
    return { current, next };
}

// 核心動畫計算：根據目前時間與 Timing Point，計算出應顯示第幾幀
// 原理：
//   1. 計算距離目前 TP 起點已過了幾拍 (totalBeats)
//   2. 取整數部分決定在第幾「拍循環段」(currentSegmentIndex)
//   3. 取小數部分決定在該段的播放進度 (beatProgress)
//   4. 根據 IMAGE_KEY 插值計算出精確幀編號
function calculateFrameIndex(currentTime, activeTP) {
    if (!activeTP) return 0;

    let timeDiff = currentTime - activeTP.time;
    // 公式：snap=1 (1/1) = 每拍推進 1 單位 = 一拍一循環段（基準）
    // snap=2 (1/2) = 每拍推進 2 單位 = 半拍一循環段（快）
    let totalBeats = (timeDiff / activeTP.beatLength) * snapDivisor;

    // ★ 單一關鍵幀模式：IMAGE_KEY 只有一個元素
    // 在節拍點重設到起始幀，播放完所有剩餘幀 (IMAGE_COUNT - startFrame) 後循環
    if (imageKey.length === 1) {
        const startFrame = imageKey[0];
        const totalFrames = imageCount - startFrame;
        let progress = totalBeats % 1.0;
        if (progress < 0) progress += 1.0;
        return Math.floor(startFrame + totalFrames * progress);
    }

    let totalSegments = imageKey.length - 1; 

    let currentSegmentIndex = Math.floor(totalBeats) % totalSegments;
    if (currentSegmentIndex < 0) currentSegmentIndex += totalSegments;

    let beatProgress = totalBeats % 1.0;
    if (beatProgress < 0) beatProgress = 1.0 + beatProgress;

    let startFrame = imageKey[currentSegmentIndex];
    let endFrame = imageKey[currentSegmentIndex + 1];
    let currentFrame = startFrame + (endFrame - startFrame) * beatProgress;

    return Math.floor(currentFrame);
}

// 將計算出的幀索引實際套用到 <img> 元素上
// 只有在圖片來源真的改變時才更新，避免無謂的 DOM 操作
function renderFrame(index) {
    if (index < 0) index = 0;
    if (index >= images.length) index = images.length - 1;
    
    if (currentImgElement && images[index]) {
        if (currentImgElement.src !== images[index].src) {
            currentImgElement.src = images[index].src;
        }
    }
}