這份更新後的 `README` 文件移除了「特色功能」區塊，並在開頭顯眼處標註了動畫素材來源，同時保留了 Gemini AI 的致謝。

### File: README.md

````markdown
# osuJAM

> **Note:** The current animation assets are courtesy of **[@nn161_9](https://x.com/nn161_9)**.

**osuJAM** is a highly responsive, BPM-synchronized animation overlay for osu!, designed to run smoothly in OBS or any browser.

Unlike simple GIF players that just change speed, osuJAM uses **absolute timing mapping** based on osu! map timing points. This ensures the animation frame is always perfectly synced with the beat, even during complex BPM changes.

## 🛠️ Prerequisites

To make this work, you need a tool to export osu! data via WebSocket:
1.  **[osu!]** (The game)
2.  **[Tosu](https://github.com/tosuapp/tosu)** or **[gosumemory](https://github.com/l3lackShark/gosumemory)**
    * Ensure the WebSocket is running on `ws://127.0.0.1:24050/ws`.

## 📂 Installation & Setup

1.  **Clone or Download** this repository.
2.  **Prepare Images**:
    * Place your animation frames in the `./images/` folder.
    * Naming convention: `gif-0.png`, `gif-1.png` ... `gif-80.png`.
    * *Note: You can configure the total frame count in `index.js`.*
3.  **Start Gosumemory/Tosu** and open osu!.
4.  **Open `index.html`** in your browser to test.

## 🎥 OBS Usage

1.  Open OBS Studio.
2.  Add a **Browser Source**.
3.  Set **URL** to the path of your `index.html`.
    * Local file example: `file:///C:/path/to/osuJAM/index.html`
    * Or use a local server address if you are hosting one.
4.  Set Width and Height according to your needs.
5.  **Check** "Refresh browser when scene becomes active".

## ⌨️ Controls & Hotkeys

Click on the window (or interact with the OBS Browser Source) to use hotkeys:

| Key | Action | Description |
| :--- | :--- | :--- |
| **`d`** | Toggle Debug | Show/Hide the debug overlay (BPM, FPS, Offset). |
| **`+`** | Increase Offset | Adds **1ms** delay (Use if animation is too fast). |
| **`-`** | Decrease Offset | Removes **1ms** delay (Use if animation is too slow). |

## ⚙️ Configuration

### URL Parameters
You can set a default offset directly in the URL to sync with your specific hardware/setup latency.

* `index.html?offset=50` (Delays animation by 50ms)
* `index.html?offset=-20` (Advances animation by 20ms)

### Code Configuration (`index.js`)
You can modify the constants at the top of the file:
```javascript
const IMAGE_COUNT = 81; // Total number of images
const IMAGE_KEY = [...]; // Keyframe mapping for loop cycles
````

## 📝 License

This project is open source. Feel free to modify and share\!

## 🤝 Credits

  * Code refactoring and logic optimization provided by **Google Gemini AI**.
