// ==========================================
// 1. 設定與全域變數
// ==========================================
const IMAGE_FORMAT = "gif-%.png";
const IMAGE_COUNT = 81;
// 定義每拍的起始幀
const IMAGE_KEY = [0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80];
// 每一拍播放的幀數 (固定為 8)
const FRAMES_PER_BEAT = 8; 

// 解析 URL Query 參數取得 Offset
const urlParams = new URLSearchParams(window.location.search);
let userOffset = parseInt(urlParams.get('offset')) || 0;
console.log(`User Offset set to: ${userOffset}ms`);

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
function preLoadImages() {
    console.log("開始預載圖片...");
    for (let i = 0; i < IMAGE_COUNT; i++) {
        const image = new Image();
        image.src = `./images/${IMAGE_FORMAT.replace("%", i)}`;
        images.push(image);
    }
    if (images.length > 0) renderFrame(0);
}
preLoadImages();

// ==========================================
// 3. WebSocket 連接
// ==========================================

function connectWebSocket() {
    const socket = new WebSocket("ws://127.0.0.1:24050/ws");

    socket.onopen = () => console.log("WebSocket 已連接");

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            currentOsuData = data;

            // 1. 偵測切歌
            const currentBeatmap = data?.menu?.bm?.path?.file;
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
// 4. 動畫渲染循環
// ==========================================

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

            // --- 計算 動畫 FPS 與 時間間隔 ---
            let animFPS = 0;
            let frameInterval = 0;

            const calcBPM = realBPM > 0 ? realBPM : currentTPBPM;

            if (calcBPM > 0) {
                frameInterval = (60000 / calcBPM) / FRAMES_PER_BEAT;
                animFPS = 1000 / frameInterval;
            }

            if (isPaused) {
                animFPS = 0;
                frameInterval = 0;
            }

            const nextTPTime = nextTP ? Math.floor(nextTP.time) : "None";
            const nextTPBpm = nextTP ? Math.round(60000 / nextTP.beatLength) : "-";

            debugEl.innerHTML = `
                Offset: <b>${userOffset}ms</b> (Press +/-)<br>
                Time: <b>${Math.floor(displayTime)}</b> ms<br>
                Render FPS: <b>${renderFPS}</b><br>
                <br>
                BPM: <b>${realBPM}</b> (Real) / <b>${baseBPM}</b> (Base)<br>
                Anim FPS: <b>${animFPS.toFixed(1)}</b> (${frameInterval.toFixed(1)}ms)<br>
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
// 5. 檔案讀取 (維持不變)
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
// 6. 計算邏輯
// ==========================================

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

function calculateFrameIndex(currentTime, activeTP) {
    if (!activeTP) return 0;

    let timeDiff = currentTime - activeTP.time;
    let totalBeats = timeDiff / activeTP.beatLength;
    let totalSegments = IMAGE_KEY.length - 1; 

    let currentSegmentIndex = Math.floor(totalBeats) % totalSegments;
    if (currentSegmentIndex < 0) currentSegmentIndex += totalSegments;

    let beatProgress = totalBeats % 1.0;
    if (beatProgress < 0) beatProgress = 1.0 + beatProgress;

    let startFrame = IMAGE_KEY[currentSegmentIndex];
    let endFrame = IMAGE_KEY[currentSegmentIndex + 1];
    let currentFrame = startFrame + (endFrame - startFrame) * beatProgress;

    return Math.floor(currentFrame);
}

function renderFrame(index) {
    if (index < 0) index = 0;
    if (index >= images.length) index = images.length - 1;
    
    if (currentImgElement && images[index]) {
        if (currentImgElement.src !== images[index].src) {
            currentImgElement.src = images[index].src;
        }
    }
}