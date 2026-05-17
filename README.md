# osuJAM

![gif](gif.gif)

> The current animation assets are courtesy of **[@nn161_9](https://x.com/nn161_9)**.

English | [中文](README-zh.md)

**osuJAM** is a highly responsive, BPM-synchronized animation overlay for osu!, designed to run smoothly in OBS or any browser.

Unlike simple GIF players that just change speed, osuJAM uses **absolute timing mapping** based on osu! map timing points. This ensures the animation frame is always perfectly synced with the beat, even during complex BPM changes.

## 🛠️ Prerequisites

To make this work, you need a tool to export osu! data via WebSocket:

1.  **[osu!]** (The game)
2.  **[Tosu](https://github.com/tosuapp/tosu)** or **[gosumemory](https://github.com/l3lackShark/gosumemory)**
    - Ensure the WebSocket is running on `ws://127.0.0.1:24050/ws`.

## 📂 Installation & Setup

1.  **Clone or Download** this repository.
2.  **Prepare Images**:
    - Place your animation frames in the `./images/` folder.
    - Naming convention: `gif-0.png`, `gif-1.png` ... `gif-80.png`.
    - _Note: You can configure the total frame count in `index.js`._
3.  **Start Gosumemory/Tosu** and open osu!.
4.  **Open `index.html`** in your browser to test.

## 🎥 OBS Usage

1.  Open OBS Studio.
2.  Add a **Browser Source**.
3.  Set **URL** to the path of your `index.html`.
    - Local file example: `file:///C:/path/to/osuJAM/index.html`
    - Or use a local server address if you are hosting one.
4.  Set Width and Height according to your needs.
5.  **Check** "Refresh browser when scene becomes active".

## ⌨️ Controls & Hotkeys

Click on the window (or interact with the OBS Browser Source) to use hotkeys:

| Key     | Action          | Description                                           |
| :------ | :-------------- | :---------------------------------------------------- |
| **`d`** | Toggle Debug    | Show/Hide the debug overlay (BPM, FPS, Offset).       |
| **`+`** | Increase Offset | Adds **1ms** delay (Use if animation is too fast).    |
| **`-`** | Decrease Offset | Removes **1ms** delay (Use if animation is too slow). |
| **`[`** | Slower Snap     | Decrease snap divisor (e.g. 1/2 → 1/1).               |
| **`]`** | Faster Snap     | Increase snap divisor (e.g. 1/1 → 1/2).               |

## ⚙️ Configuration

### Tosu Settings Panel

Open Tosu (`http://127.0.0.1:24050`), go to **Overlays → miyabi-jam → Settings** to adjust the following in real-time:

| Setting ID    | Type   | Description                                                                                             | Default                       |
| :------------ | :----- | :------------------------------------------------------------------------------------------------------ | :---------------------------- |
| `ImageFormat` | text   | Frame filename pattern. `%` is replaced with the frame number.                                          | `gif-%.png`                   |
| `ImageCount`  | number | Total number of frames. Must match the actual file count in `./images/`.                                | `81`                          |
| `ImageKey`    | text   | Beat keyframe mapping, comma-separated. e.g. `0,8,16,24,32,40,48,56,64,72`                              | `0,8,16,24,32,40,48,56,64,72` |
| `UserOffset`  | number | Timing offset in milliseconds. Positive = delay, Negative = advance. Also adjustable with `+`/`-` keys. | `0`                           |
| `SnapDivisor` | number | Beat subdivision (1/2/3/4/6/8). Also adjustable with `[`/`]` keys.                                      | `1`                           |

> Changing `ImageFormat` or `ImageCount` will automatically reload all images.

### Code Defaults (`index.js`)

You can also modify the default values directly at the top of `index.js`:

```javascript
let imageFormat = "gif-%.png"; // Frame filename pattern
let imageCount = 81;            // Total frame count
let imageKey = [...];           // Keyframe mapping
```

---

## 🔄 How to Replace the Animation

Follow these steps to swap in your own animation frames.

### Step 1 — Prepare Your Images

Split your animation into individual PNG frames and name them sequentially:

```
gif-0.png, gif-1.png, gif-2.png, ... gif-N.png
```

Place all files inside the `./images/` folder.

### Step 2 — Adjust via Tosu Settings Panel or modify `index.js` defaults

**Option A (recommended)**: Open Tosu, go to Overlays → miyabi-jam → Settings and adjust in real-time.

**Option B**: Directly edit the defaults at the top of `index.js`:

```javascript
// Change to match your file naming pattern (% is replaced with the frame number)
let imageFormat = "gif-%.png";

// Set this to the total number of frames you have
let imageCount = 81;

// ★ Single-keyframe mode: [startFrame]
let imageKey = [0];

// ★ Multi-keyframe mode: [0, 8, 16, ...]
let imageKey = [0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80];
```

> **Snap speed** is controlled at runtime with `[` / `]` keys, or set via Tosu Settings Panel (`SnapDivisor`).
>
> - `1/1` = one loop segment per beat (default, recommended starting point)
> - `1/2` = one segment per half-beat (2× faster)
> - `1/4` = one segment per quarter-beat (4× faster)

### Step 3 — Calculate Your `IMAGE_KEY`

**Single-keyframe mode** — use `[startFrame]` when the whole animation is one loop:

| Your Animation    | `IMAGE_COUNT` | `IMAGE_KEY` |
| :---------------- | :-----------: | :---------- |
| 10 frames, 1 loop |     `10`      | `[0]`       |
| 81 frames, 1 loop |     `81`      | `[0]`       |

**Multi-keyframe mode** — use when each beat maps to a specific frame range:

> **frames per beat** = total frames ÷ beats per loop

| Your Animation                   | `IMAGE_COUNT` | Beats per Loop | `IMAGE_KEY` Example                          |
| :------------------------------- | :-----------: | :------------: | :------------------------------------------- |
| 81 frames, 10-beat loop, 8f/beat |     `81`      |      `10`      | `[0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80]` |
| 60 frames, 4-beat loop, 15f/beat |     `60`      |      `4`       | `[0, 15, 30, 45, 60]`                        |
| 48 frames, 4-beat loop, 12f/beat |     `48`      |      `4`       | `[0, 12, 24, 36, 48]`                        |
| 32 frames, 2-beat loop, 16f/beat |     `32`      |      `2`       | `[0, 16, 32]`                                |

> **Note (multi-keyframe):** The last value must always equal `IMAGE_COUNT - 1`.

## 📝 License

This project is open source. Feel free to modify and share\!

## 🤝 Credits

- Code refactoring and logic optimization provided by **Google Gemini AI**.
