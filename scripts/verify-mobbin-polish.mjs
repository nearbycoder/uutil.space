import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const base = process.env.TEST_URL ?? "http://localhost:3107";
const session = `mobbin-polish-${process.pid}`;
const run = (...args) => execFileSync("agent-browser", ["--session", session, ...args], { encoding: "utf8", timeout: 30000 });
const value = code => JSON.parse(JSON.parse(run("eval", `JSON.stringify(${code})`)));
const wait = code => run("wait", "--fn", code);
const click = name => run("find", "role", "button", "click", "--name", name, "--exact");
try {
  for (const theme of ["dark", "light"]) for (const width of [320, 390, 1024, 1440]) {
    run("open", `${base}/tools/csv-pivot-table`);
    run("set", "viewport", String(width), "900");
    wait('document.querySelector(".app-shell")?.dataset.ready === "true"');
    if (value('document.querySelector(".app-shell").dataset.theme') !== theme) click(`Switch to ${theme} mode`);
    assert.equal(value("innerWidth"), width);
    const geometry = value(`(() => {
      const controls = [...document.querySelectorAll('.workspace-actions button')].map(el => ({top:el.getBoundingClientRect().top,height:el.getBoundingClientRect().height,width:el.getBoundingClientRect().width}));
      const fields = [...document.querySelectorAll('.local-tool-field[data-field-kind="text"],.local-tool-field[data-field-kind="select"]')].map(el => el.getBoundingClientRect().left);
      return { controls, columns:new Set(fields).size, overflow:document.querySelector('main').scrollWidth>document.querySelector('main').clientWidth+1,
        headerHeights:[...document.querySelectorAll('.local-tool .tool-panel-header')].map(el=>el.getBoundingClientRect().height),
        themeColor:document.querySelector('meta[name="theme-color"]').content,
        inputHeight:document.querySelector('.local-tool input').getBoundingClientRect().height,
        notesOpen:document.querySelector('.local-tool-help').open };
    })()`);
    assert.equal(geometry.columns, width >= 1280 ? 2 : 1, "Container queries should compact only sufficiently wide input panels");
    assert(!geometry.overflow);
    assert(geometry.controls.every(control => control.height >= 44 && control.width >= 44));
    assert(geometry.controls.every(control => Math.abs(control.top-geometry.controls[0].top)<1), "Workspace toolbar must fit on one row");
    assert(geometry.inputHeight >= 44 && geometry.inputHeight <= 48, "Inputs should retain a comfortable, compact touch target");
    assert.equal(geometry.themeColor, theme === "dark" ? "#111314" : "#f5f6f7");
    assert.equal(geometry.notesOpen, false);
    if (width >= 1024) assert(Math.abs(geometry.headerHeights[0]-geometry.headerHeights[1])<1);
    run("scrollintoview", ".local-tool-help summary");
    run("click", ".local-tool-help summary");
    wait('document.querySelector(".local-tool-help").open');
    assert(value('document.querySelector(".local-tool-help").open'));
    assert(value('document.querySelector(".local-tool-help p").getBoundingClientRect().height>0'));
    run("press", "Space");
    wait('!document.querySelector(".local-tool-help").open');
    assert.equal(value('document.querySelector(".local-tool-help").open'), false);
    click("Run tool");
    wait('document.querySelector(".local-tool pre").textContent.includes("Design,15,18")');
    run("screenshot", `/tmp/mobbin-polish-${theme}-${width}.png`);
    click("My workspace");
    assert.equal(value('getComputedStyle(document.querySelector(".workspace-sections")).flexWrap'), "nowrap");
    click("Offline & install");
    assert(value('document.querySelector(".workspace-dialog").innerText.includes("Offline")'));
    const tabVisible = value(`(() => {const nav=document.querySelector('.workspace-sections'); const tab=[...nav.querySelectorAll('button')].find(el=>el.getAttribute('aria-pressed')==='true');const a=nav.getBoundingClientRect(),b=tab.getBoundingClientRect();return b.left>=a.left-1&&b.right<=a.right+1;})()`);
    assert(tabVisible, "Off-screen workspace tabs must scroll into view when activated");
    click("Close workspace");
    click("Find a tool");
    wait('getComputedStyle(document.querySelector(".mobile-tool-sheet")).opacity === "1"');
    run("fill", 'input[aria-label="Search tools"]', "CSV Pivot Table");
    assert.equal(value('document.querySelector(".tool-library-category").textContent'), "Conversion");
    assert.equal(value('getComputedStyle(document.querySelector(".tool-library-category")).fontSize'), "11px");
    assert(value('document.querySelector(".sidebar-tool").getBoundingClientRect().height>=62'));
    assert(value('document.querySelector(".tool-library-favorite").getBoundingClientRect().width>=44'));
    run("press", "ArrowDown");
    wait('document.activeElement.classList.contains("sidebar-tool")');
    run("press", "Enter");
    wait('!document.querySelector(".mobile-tools-dialog").open');
    console.log(`PASS ${theme} ${width}px: toolbar, compact fields, notes disclosure, workspace tabs, library metadata, keyboard selection and theme chrome`);
  }
  assert.equal(run("errors").trim(), "");
} finally { run("close"); }
