import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const [id, expected] = process.argv.slice(2);
if (!id || !expected) throw new Error("Pass a tool ID and expected output substring.");
// Isolate each subprocess: a closing daemon must not race the next tool's startup.
const session = `local-tool-release-${process.pid}`;
const run = (...args) => execFileSync("agent-browser", ["--session", session, ...args], { encoding: "utf8", timeout: 30000 });
const value = code => JSON.parse(JSON.parse(run("eval", `JSON.stringify(${code})`)));
try {
  for (const width of [390, 1440]) {
    run("open", `${process.env.TEST_URL ?? "http://localhost:3107"}/tools/${id}`);
    run("set", "viewport", String(width), "900");
    run("wait", "--fn", 'document.querySelector(".app-shell")?.dataset.ready === "true" && !!document.querySelector(".local-tool")');
    assert.equal(value("innerWidth"), width, "Browser viewport must match the requested test width");
    run("find", "role", "button", "click", "--name", "Run tool", "--exact");
    run("wait", "--fn", `document.querySelector('.local-tool pre')?.textContent.includes(${JSON.stringify(expected)})`);
    assert(!value('document.querySelector("main").scrollWidth > document.querySelector("main").clientWidth + 2'));
    if (id === "byte-hexdump") {
      assert.equal(value('getComputedStyle(document.querySelector(".local-tool pre")).whiteSpace'), "pre");
      assert.equal(value('getComputedStyle(document.querySelector(".local-tool pre")).overflowX'), "auto");
    }
    assert(!value('document.querySelector(".local-tool [role=alert]") !== null'));
    run("wait", "--fn", 'document.activeElement === document.querySelector(".local-tool pre")');
    const expectedText = value('document.querySelector(".local-tool pre").textContent');
    if (id === "css-bezier-sampler") {
      const difference = value(`(() => {
        const report = JSON.parse(document.querySelector(".local-tool pre").textContent);
        const sample = document.createElement("span");
        sample.style.cssText = "position:fixed;visibility:hidden";
        document.body.append(sample);
        const animation = sample.animate([{ transform: "translateX(0px)" }, { transform: "translateX(100px)" }], { duration: report.durationMs, easing: report.easing, fill: "both" });
        animation.pause(); animation.currentTime = report.durationMs / 2;
        const actual = new DOMMatrix(getComputedStyle(sample).transform).m41;
        const expected = report.samples.find(row => row.inputProgress === 0.5).value;
        animation.cancel(); sample.remove();
        return Math.abs(actual - expected);
      })()`);
      assert(difference < 0.02, "Bezier samples must match browser animation timing");
    }
    if (id === "css-fluid-type") {
      const difference = value(`(() => {
        const report = JSON.parse(document.querySelector(".local-tool pre").textContent);
        const root = document.documentElement, previous = root.style.fontSize;
        const sample = document.createElement("span");
        root.style.fontSize = "16px";
        sample.style.cssText = report.css + "position:fixed;visibility:hidden";
        document.body.append(sample);
        const actual = parseFloat(getComputedStyle(sample).fontSize);
        const expected = Math.max(16, Math.min(24, 16 + (innerWidth - 360) * 8 / 920));
        sample.remove(); root.style.fontSize = previous;
        return Math.abs(actual - expected);
      })()`);
      assert(difference < 0.001, "Generated fluid CSS must match the calculator in a browser");
    }
    run("eval", 'window.__downloadText = null; window.__downloadName = null; const create = URL.createObjectURL.bind(URL); URL.createObjectURL = blob => { blob.text().then(text => window.__downloadText = text); return create(blob); }; const anchorClick = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function() { window.__downloadName = this.download; return anchorClick.call(this); };');
    run("find", "role", "button", "click", "--name", "Download result", "--exact");
    run("wait", "--fn", 'window.__downloadText !== null');
    assert.equal(value('window.__downloadText'), expectedText);
    assert(value('window.__downloadName.length > 0'));
    run("find", "role", "button", "click", "--name", "Copy result", "--exact");
    run("wait", "--fn", 'document.body.innerText.includes("Result copied")');
    run("screenshot", `/tmp/${id}-${width}.png`);
    // A whitespace-only value exercises required-field validation and emits an input event.
    run("fill", ".local-tool .space-y-5 > div:first-child :is(textarea,input)", " ");
    run("find", "role", "button", "click", "--name", "Run tool", "--exact");
    run("wait", "--fn", '!!document.querySelector(".local-tool [role=alert]")');
    run("find", "role", "button", "click", "--name", "Reset example", "--exact");
    assert(value('document.querySelector(".local-tool pre").textContent.includes("Your result")'));
    console.log(`PASS ${id}: ${width}px transform, focus, copy, download bytes, invalid input, reset, layout`);
  }
  assert.equal(run("errors").trim(), "");
} finally { run("close"); }
