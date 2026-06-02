# CastleRoyaleJackpotArena (React)

Production build of the animated **JACKPOT ring** title background for *The Castle Royale*.
Self-contained — the title art is embedded in the component, so there is **no external image** to ship.

Baked-in tuned values: **Ticker 0.58 · Counter 0.81 · Gold sheen 0.14 · Glow/sparkle 0.63 · reverse off.**
The slider UI from the preview has been removed; this is a clean full-bleed canvas.

## Install
Drop `CastleRoyaleJackpotArena.jsx` into your project (e.g. `src/components/`).
No dependencies beyond React. WebGL only.

## Use as a full-screen background
```jsx
import CastleRoyaleJackpotArena from "./components/CastleRoyaleJackpotArena";

export default function Screen() {
  return (
    <div style={{ position: "relative", width: "100%", height: "100dvh" }}>
      {/* background fills the parent */}
      <div style={{ position: "absolute", inset: 0 }}>
        <CastleRoyaleJackpotArena />
      </div>

      {/* your game UI sits on top */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ...buttons, cards, etc... */}
      </div>
    </div>
  );
}
```
The component fills whatever box you put it in. It’s built for a **portrait** container
(art is 941×1672), which matches a phone screen.

## Fire the win-burst on a JACKPOT
```jsx
import { useRef } from "react";
import CastleRoyaleJackpotArena from "./components/CastleRoyaleJackpotArena";

function Game() {
  const arena = useRef(null);
  // call when the player wins:
  const onWin = () => arena.current?.jackpot();

  return <CastleRoyaleJackpotArena ref={arena} />;
}
```

## Props (all optional)
| prop       | default | meaning                                    |
|------------|---------|--------------------------------------------|
| `ticker`   | `0.58`  | ticker-ring spin speed                     |
| `counter`  | `0.81`  | counter-ring spin speed                    |
| `sheen`    | `0.14`  | gold sheen sweep intensity                 |
| `glow`     | `0.63`  | glow / sparkle intensity                   |
| `reverse`  | `false` | flip spin direction                        |
| `parallax` | `true`  | subtle pointer parallax (no effect on idle touch) |
| `className`/`style` | – | forwarded to the wrapper `<div>`     |

## Notes
- Device-pixel-ratio is capped at **2** for smooth 60fps on phones (incl. iPhone 16 Pro Max).
- Cleans up its animation loop, observers, listeners, and GL resources on unmount.
- To swap the art later, replace the `IMG` data-URI constant at the top of the component.
