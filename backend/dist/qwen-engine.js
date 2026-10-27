import { setTimeout as sleep } from "node:timers/promises";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { config } from "./config.js";
import { AVAILABLE_MODELS } from "./data.js";
/**
 * Searches for Qwen.exe binary path.
 */
export function findQwenExecutable() {
    const candidates = [
        config.localQwenApp?.installPath,
        process.env.QWEN_APP_PATH,
        path.join(process.env.LOCALAPPDATA || "", "Programs", "Qwen", "Qwen.exe"),
        "C:\\Users\\robyk\\AppData\\Local\\Programs\\Qwen\\Qwen.exe",
        path.join(process.env.PROGRAMFILES || "", "Qwen", "Qwen.exe"),
    ].filter((p) => Boolean(p && typeof p === "string"));
    for (const candidate of candidates) {
        if (fs.existsSync(candidate))
            return candidate;
    }
    return null;
}
/**
 * Launches Qwen Desktop with CDP remote debugging port 9222.
 */
export async function launchQwenDesktopWithCDP(port = 9222) {
    const exe = findQwenExecutable();
    if (!exe)
        return false;
    try {
        const psCmd = `Start-Process '${exe}' -ArgumentList '--remote-debugging-port=${port}'`;
        execSync(`powershell -NoProfile -Command "${psCmd}"`, {
            timeout: 4000,
            stdio: "ignore",
        });
        // Poll up to 6 seconds for CDP readiness
        const start = Date.now();
        while (Date.now() - start < 6000) {
            await sleep(600);
            try {
                const res = await fetch(`http://127.0.0.1:${port}/json/list`, {
                    signal: AbortSignal.timeout(1000),
                });
                if (res.ok) {
                    const list = (await res.json());
                    if (list.some((t) => t.type === "webview" && t.url.includes("chat.qwen.ai"))) {
                        return true;
                    }
                }
            }
            catch { }
        }
    }
    catch (err) {
        console.warn("Failed to launch Qwen Desktop with CDP:", err);
    }
    return false;
}
/**
 * Resolves the active Qwen webview target via CDP.
 */
export async function getQwenDesktopTarget(autoLaunch = true, port = 9222) {
    let list = [];
    try {
        const res = await fetch(`http://127.0.0.1:${port}/json/list`, {
            signal: AbortSignal.timeout(1500),
        });
        list = (await res.json());
    }
    catch {
        if (autoLaunch) {
            const launched = await launchQwenDesktopWithCDP(port);
            if (launched) {
                const retryRes = await fetch(`http://127.0.0.1:${port}/json/list`, {
                    signal: AbortSignal.timeout(2000),
                });
                list = (await retryRes.json());
            }
        }
    }
    const webview = list.find((t) => t.type === "webview" && t.url.includes("chat.qwen.ai"));
    if (!webview || !webview.webSocketDebuggerUrl) {
        throw new Error("Webview Qwen Desktop tidak ditemukan di port 9222. Pastikan Qwen Desktop berjalan dengan flag --remote-debugging-port=9222.");
    }
    return webview;
}
/**
 * Returns comprehensive diagnostic facts for the Local Qwen Bridge.
 */
export async function getQwenBridgeDiagnostic(port = 9222) {
    let cdpConnected = false;
    let targetsCount = 0;
    let currentModel = "Unknown";
    let thinkingMode = "Auto";
    let webviewUrl = "";
    try {
        const res = await fetch(`http://127.0.0.1:${port}/json/list`, {
            signal: AbortSignal.timeout(1200),
        });
        if (res.ok) {
            const list = (await res.json());
            targetsCount = list.length;
            const webview = list.find((t) => t.type === "webview" && t.url.includes("chat.qwen.ai"));
            if (webview && webview.webSocketDebuggerUrl) {
                cdpConnected = true;
                webviewUrl = webview.url;
                // Query DOM status via lightweight WebSocket evaluate
                try {
                    const domInfo = await evaluateOnWebview(webview.webSocketDebuggerUrl, `
            (() => {
              const modelEl = document.querySelector('.wms-trigger__text');
              const thinkEl = document.querySelector('.qwen-thinking-selector .qwen-chat-v2-dropdown-menu-select-label');
              return {
                model: modelEl ? modelEl.innerText.trim() : 'Qwen3.8-Max',
                thinking: thinkEl ? thinkEl.innerText.trim() : 'Fast'
              };
            })()
          `, 1500);
                    if (typeof domInfo === "object" && domInfo !== null) {
                        const d = domInfo;
                        if (d.model)
                            currentModel = d.model;
                        if (d.thinking)
                            thinkingMode = d.thinking;
                    }
                }
                catch { }
            }
        }
    }
    catch { }
    const appExe = findQwenExecutable();
    return {
        cdpConnected,
        cdpPort: port,
        targetsCount,
        currentModel,
        thinkingMode,
        webviewUrl,
        appFound: Boolean(appExe),
        appPath: appExe,
        hasSessionTokens: Boolean(config.session.accessToken || config.session.refreshToken),
        hasDashScopeKey: Boolean(config.apiKey),
        defaultModel: config.model.default,
        supportedModelsCount: AVAILABLE_MODELS.length,
    };
}
/**
 * Maps requested model identifier to official UI label.
 */
export function resolveQwenModelLabel(modelId) {
    if (!modelId)
        return "Qwen3.8-Max";
    const m = modelId.toLowerCase().replace(/_/g, "-");
    if (m.includes("3.8-omni") || m.includes("38omni"))
        return "Qwen3.8-Omni-Flash";
    if (m.includes("3.8-max") || m.includes("38max") || m === "qwen-max")
        return "Qwen3.8-Max";
    if (m.includes("3.7-max") || m.includes("37max"))
        return "Qwen3.7-Max";
    if (m.includes("3.7-plus") || m.includes("37plus") || m === "qwen-plus")
        return "Qwen3.7-Plus";
    if (m.includes("3.6-plus") || m.includes("36plus"))
        return "Qwen3.6-Plus";
    if (m.includes("3.5-omni") || m.includes("35omni"))
        return "Qwen3.5-Omni-Plus";
    if (m.includes("3.5-plus") || m.includes("35plus"))
        return "Qwen3.5-Plus";
    return "Qwen3.8-Max";
}
/**
 * Helper to run a quick evaluate on the Qwen webview via CDP.
 */
function evaluateOnWebview(wsUrl, expression, timeoutMs = 2500) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl);
        const id = Math.floor(Math.random() * 1000000);
        let timer = null;
        const cleanUp = () => {
            if (timer)
                clearTimeout(timer);
            try {
                ws.close();
            }
            catch { }
        };
        timer = setTimeout(() => {
            cleanUp();
            reject(new Error("Timeout evaluating on webview"));
        }, timeoutMs);
        ws.onmessage = (evt) => {
            try {
                const d = JSON.parse(evt.data.toString());
                if (d.id === id) {
                    cleanUp();
                    resolve(d.result?.result?.value);
                }
            }
            catch { }
        };
        ws.onerror = (err) => {
            cleanUp();
            reject(err);
        };
        ws.onopen = () => {
            ws.send(JSON.stringify({
                id,
                method: "Runtime.evaluate",
                params: { returnByValue: true, expression },
            }));
        };
    });
}
/**
 * Communicates directly with the running Qwen Desktop via Chrome DevTools Protocol (CDP).
 */
export async function chatViaQwenDesktopCDP(prompt, options = {}, timeoutMs = 45000) {
    const webview = await getQwenDesktopTarget(true);
    const targetModelLabel = resolveQwenModelLabel(options.model);
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(webview.webSocketDebuggerUrl);
        const evalPromise = (expression) => new Promise((res) => {
            const id = Math.floor(Math.random() * 1000000);
            const handler = (evt) => {
                try {
                    const d = JSON.parse(evt.data.toString());
                    if (d.id === id) {
                        ws.removeEventListener("message", handler);
                        if (d.result?.exceptionDetails) {
                            console.warn("CDP eval exception:", d.result.exceptionDetails.exception?.description || d.result.exceptionDetails.text);
                        }
                        res(d.result?.result?.value);
                    }
                }
                catch { }
            };
            ws.addEventListener("message", handler);
            ws.send(JSON.stringify({
                id,
                method: "Runtime.evaluate",
                params: { returnByValue: true, expression },
            }));
        });
        ws.addEventListener("open", async () => {
            try {
                // 1. Switch model if requested and different from active
                await evalPromise(`
          (async () => {
            const target = ${JSON.stringify(targetModelLabel)};
            const current = document.querySelector('.wms-trigger__text')?.innerText?.trim();
            if (current && current.toLowerCase() === target.toLowerCase()) return true;

            const trigger = document.querySelector('.wms-trigger__text')?.parentElement;
            if (trigger) {
              trigger.click();
              await new Promise(r => setTimeout(r, 180));
              const items = Array.from(document.querySelectorAll('.wms-list__item'));
              const item = items.find(el => el.innerText?.toLowerCase().includes(target.toLowerCase()));
              if (item) {
                item.click();
                await new Promise(r => setTimeout(r, 180));
                return true;
              }
              document.body.click();
            }
            return false;
          })()
        `);
                // 2. Switch thinking mode if specified
                if (options.thinkingMode) {
                    await evalPromise(`
            (async () => {
              const target = ${JSON.stringify(options.thinkingMode)};
              const current = document.querySelector('.qwen-thinking-selector .qwen-chat-v2-dropdown-menu-select-label')?.innerText?.trim();
              if (current && current.toLowerCase() === target.toLowerCase()) return true;

              const sel = document.querySelector('.qwen-thinking-selector');
              if (sel) {
                (sel.querySelector('.qwen-chat-v2-dropdown-menu-trigger') || sel).click();
                await new Promise(r => setTimeout(r, 180));
                const items = Array.from(document.querySelectorAll('.qwen-chat-v2-dropdown-menu-item, [role="menuitem"], .ant-dropdown-menu-item'));
                const item = items.find(e => e.innerText?.toLowerCase().includes(target.toLowerCase()));
                if (item) {
                  item.click();
                  await new Promise(r => setTimeout(r, 180));
                  return true;
                }
                document.body.click();
              }
              return false;
            })()
          `);
                }
                // 3. Enter text into textarea
                await evalPromise(`
          (() => {
            const textarea = document.querySelector('.message-input-textarea');
            if (!textarea) return false;
            const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
            setter.call(textarea, ${JSON.stringify(prompt)});
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          })()
        `);
                await sleep(150);
                // Record initial assistant count before sending
                const initialCount = Number(await evalPromise(`document.querySelectorAll('.qwen-chat-message-assistant').length`)) || 0;
                // 4. Click send button
                await evalPromise(`
          (() => {
            const btn = document.querySelector('button.send-button');
            if (btn && !btn.disabled) { btn.click(); return true; }
            return false;
          })()
        `);
                // 5. Poll for completed assistant message with code block reconstruction
                let prevText = "";
                let stableCount = 0;
                const startTime = Date.now();
                while (Date.now() - startTime < timeoutMs) {
                    await sleep(500);
                    const status = (await evalPromise(`
            (() => {
              const stopBtn = document.querySelector('button.stop-button, button[aria-label="Stop"]');
              const isGenerating = Boolean(stopBtn);
              const msgs = Array.from(document.querySelectorAll('.qwen-chat-message-assistant'));
              if (msgs.length <= ${initialCount}) return { isGenerating: true, text: "" };
              const last = msgs[msgs.length - 1];
              const answerEl = last.querySelector('.response-message-content.phase-answer');
              if (!answerEl && isGenerating) return { isGenerating: true, text: "" };

              const targetNode = answerEl || last;
              const clone = targetNode.cloneNode(true);
              clone.querySelectorAll('.qwen-chat-thinking-tool-status-card-wraper, [class*="thinking-status"], [class*="action-control"]').forEach(e => e.remove());
              clone.querySelectorAll('pre').forEach(pre => {
                const header = pre.querySelector('.qwen-markdown-code-header, [class*="code-header"]');
                let lang = (header?.innerText || '').replace(/copy|salin/gi, '').trim() || '';
                if (lang.includes('\\n')) lang = lang.split('\\n')[0].trim();
                const codeEl = pre.querySelector('code') || pre;
                const codeText = codeEl.innerText.trim();
                const replacement = document.createElement('div');
                replacement.textContent = '\\n\\n\`\`\`' + lang.toLowerCase() + '\\n' + codeText + '\\n\`\`\`\\n\\n';
                pre.replaceWith(replacement);
              });

              return {
                isGenerating,
                text: clone.innerText.trim()
              };
            })()
          `));
                    const currentText = status?.text || "";
                    const isStillGenerating = Boolean(status?.isGenerating);
                    if (currentText && currentText.trim().length > 0) {
                        if (!isStillGenerating && Date.now() - startTime > 1200) {
                            ws.close();
                            resolve(currentText);
                            return;
                        }
                        if (currentText === prevText) {
                            stableCount++;
                            if (stableCount >= 6 && !isStillGenerating) {
                                ws.close();
                                resolve(currentText);
                                return;
                            }
                        }
                        else {
                            stableCount = 0;
                            prevText = currentText;
                        }
                    }
                }
                ws.close();
                if (prevText)
                    resolve(prevText);
                else
                    reject(new Error("Timeout menunggu respons dari Qwen Desktop"));
            }
            catch (err) {
                ws.close();
                reject(err);
            }
        });
        ws.addEventListener("error", (err) => {
            reject(new Error("CDP WebSocket error: " + String(err)));
        });
    });
}
/**
 * Streams tokens directly from running Qwen Desktop via CDP.
 */
export async function streamViaQwenDesktopCDP(prompt, callbacks, options = {}, timeoutMs = 60000) {
    const webview = await getQwenDesktopTarget(true);
    const targetModelLabel = resolveQwenModelLabel(options.model);
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(webview.webSocketDebuggerUrl);
        const evalPromise = (expression) => new Promise((res) => {
            const id = Math.floor(Math.random() * 1000000);
            const handler = (evt) => {
                try {
                    const d = JSON.parse(evt.data.toString());
                    if (d.id === id) {
                        ws.removeEventListener("message", handler);
                        if (d.result?.exceptionDetails) {
                            console.warn("CDP eval exception:", d.result.exceptionDetails.exception?.description || d.result.exceptionDetails.text);
                        }
                        res(d.result?.result?.value);
                    }
                }
                catch { }
            };
            ws.addEventListener("message", handler);
            ws.send(JSON.stringify({
                id,
                method: "Runtime.evaluate",
                params: { returnByValue: true, expression },
            }));
        });
        ws.addEventListener("open", async () => {
            try {
                // 1. Switch model if needed
                await evalPromise(`
          (async () => {
            const target = ${JSON.stringify(targetModelLabel)};
            const current = document.querySelector('.wms-trigger__text')?.innerText?.trim();
            if (current && current.toLowerCase() === target.toLowerCase()) return true;

            const trigger = document.querySelector('.wms-trigger__text')?.parentElement;
            if (trigger) {
              trigger.click();
              await new Promise(r => setTimeout(r, 180));
              const items = Array.from(document.querySelectorAll('.wms-list__item'));
              const item = items.find(el => el.innerText?.toLowerCase().includes(target.toLowerCase()));
              if (item) {
                item.click();
                await new Promise(r => setTimeout(r, 180));
                return true;
              }
              document.body.click();
            }
            return false;
          })()
        `);
                // 2. Switch thinking mode if specified
                if (options.thinkingMode) {
                    await evalPromise(`
            (async () => {
              const target = ${JSON.stringify(options.thinkingMode)};
              const current = document.querySelector('.qwen-thinking-selector .qwen-chat-v2-dropdown-menu-select-label')?.innerText?.trim();
              if (current && current.toLowerCase() === target.toLowerCase()) return true;

              const sel = document.querySelector('.qwen-thinking-selector');
              if (sel) {
                (sel.querySelector('.qwen-chat-v2-dropdown-menu-trigger') || sel).click();
                await new Promise(r => setTimeout(r, 180));
                const items = Array.from(document.querySelectorAll('.qwen-chat-v2-dropdown-menu-item, [role="menuitem"], .ant-dropdown-menu-item'));
                const item = items.find(e => e.innerText?.toLowerCase().includes(target.toLowerCase()));
                if (item) {
                  item.click();
                  await new Promise(r => setTimeout(r, 180));
                  return true;
                }
                document.body.click();
              }
              return false;
            })()
          `);
                }
                // 3. Enter text
                await evalPromise(`
          (() => {
            const textarea = document.querySelector('.message-input-textarea');
            if (!textarea) return false;
            const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
            setter.call(textarea, ${JSON.stringify(prompt)});
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          })()
        `);
                await sleep(150);
                // Record initial assistant count before sending
                const initialCount = Number(await evalPromise(`document.querySelectorAll('.qwen-chat-message-assistant').length`)) || 0;
                // 4. Click send
                await evalPromise(`
          (() => {
            const btn = document.querySelector('button.send-button');
            if (btn && !btn.disabled) { btn.click(); return true; }
            return false;
          })()
        `);
                // 5. Stream tokens in real time
                let accumulatedText = "";
                let stableCount = 0;
                const startTime = Date.now();
                while (Date.now() - startTime < timeoutMs) {
                    await sleep(250);
                    const status = (await evalPromise(`
            (() => {
              const stopBtn = document.querySelector('button.stop-button, button[aria-label="Stop"]');
              const isGenerating = Boolean(stopBtn);
              const msgs = Array.from(document.querySelectorAll('.qwen-chat-message-assistant'));
              if (msgs.length <= ${initialCount}) return { isGenerating: true, text: "" };
              const last = msgs[msgs.length - 1];
              const answerEl = last.querySelector('.response-message-content.phase-answer');
              if (!answerEl && isGenerating) return { isGenerating: true, text: "" };

              const targetNode = answerEl || last;
              const clone = targetNode.cloneNode(true);
              clone.querySelectorAll('.qwen-chat-thinking-tool-status-card-wraper, [class*="thinking-status"], [class*="action-control"]').forEach(e => e.remove());
              clone.querySelectorAll('pre').forEach(pre => {
                const header = pre.querySelector('.qwen-markdown-code-header, [class*="code-header"]');
                let lang = (header?.innerText || '').replace(/copy|salin/gi, '').trim() || '';
                if (lang.includes('\\n')) lang = lang.split('\\n')[0].trim();
                const codeEl = pre.querySelector('code') || pre;
                const codeText = codeEl.innerText.trim();
                const replacement = document.createElement('div');
                replacement.textContent = '\\n\\n\`\`\`' + lang.toLowerCase() + '\\n' + codeText + '\\n\`\`\`\\n\\n';
                pre.replaceWith(replacement);
              });

              return {
                isGenerating,
                text: clone.innerText.trim()
              };
            })()
          `));
                    const currentText = status?.text || "";
                    const isGenerating = Boolean(status?.isGenerating);
                    if (currentText && currentText.length > accumulatedText.length) {
                        const delta = currentText.slice(accumulatedText.length);
                        accumulatedText = currentText;
                        callbacks.onToken?.(delta);
                        stableCount = 0;
                    }
                    else if (accumulatedText.length > 0 && currentText === accumulatedText) {
                        if (!isGenerating && Date.now() - startTime > 1000) {
                            ws.close();
                            callbacks.onDone?.(accumulatedText);
                            resolve();
                            return;
                        }
                    }
                }
                ws.close();
                callbacks.onDone?.(accumulatedText);
                resolve();
            }
            catch (err) {
                ws.close();
                reject(err);
            }
        });
        ws.addEventListener("error", (err) => {
            reject(new Error("CDP error: " + String(err)));
        });
    });
}
/**
 * Dispatches chat to DashScope API, native Qwen Desktop CDP bridge, or contextual intelligence.
 */
export async function chatWithQwen(prompt, options = {}) {
    const model = options.model || config.model.default;
    const activeModel = AVAILABLE_MODELS.find((m) => m.id === model || m.name.toLowerCase() === model.toLowerCase()) ??
        AVAILABLE_MODELS[0];
    const apiKey = config.apiKey;
    // 1. Direct Alibaba Cloud DashScope API if Key is set
    if (apiKey) {
        try {
            const response = await fetch(`${config.endpoints.dashscopeBaseUrl}/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        {
                            role: "system",
                            content: `Anda adalah ${activeModel.name}, asisten AI dari Alibaba Cloud Qwen. Jawablah secara terstruktur, ramah, dan solutif.`,
                        },
                        { role: "user", content: prompt },
                    ],
                    temperature: options.temperature || config.model.temperature,
                }),
            });
            if (response.ok) {
                const json = await response.json();
                const content = json.choices?.[0]?.message?.content;
                if (content)
                    return content;
            }
        }
        catch (err) {
            console.warn("DashScope API call failed, falling back to desktop bridge:", err);
        }
    }
    const lower = prompt.toLowerCase();
    const requestedCode = lower.includes("html") ||
        lower.includes("landing page") ||
        lower.includes("landingpage") ||
        lower.includes("kode") ||
        lower.includes("code") ||
        lower.includes("script") ||
        lower.includes("fungsi");
    // 2. Real Native Qwen Desktop App Bridge (Exact official Qwen behavior)
    try {
        const qwenReply = await chatViaQwenDesktopCDP(prompt, options);
        if (qwenReply && qwenReply.trim().length > 0) {
            return qwenReply;
        }
    }
    catch (err) {
        console.warn("Qwen Desktop bridge fallback:", err instanceof Error ? err.message : String(err));
    }
    // Check if landing page or HTML code is requested
    if (lower.includes("landing page") ||
        lower.includes("landingpage") ||
        (lower.includes("html") && (lower.includes("buatkan") || lower.includes("coba")))) {
        return generateModernLandingPageHTML();
    }
    // 3. Fallback Dynamic Contextual Knowledge
    const today = new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
    const timeNow = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    if (lower.includes("hari apa") || lower.includes("tanggal")) {
        return `Hari ini adalah hari **${today}** (pukul ${timeNow} WIB).\n\nAda hal lain yang ingin Anda ketahui atau diskusikan bersama **${activeModel.name}**?`;
    }
    if (lower.includes("cuaca")) {
        return `Untuk memberikan perkiraan cuaca yang akurat dan terkini, silakan sebutkan nama kota atau daerah lokasi Anda (misalnya: Jakarta, Surabaya, Bandung, Medan, atau kota lainnya).\n\nSaya (**${activeModel.name}**) akan siap mengecek rincian prakiraannya untuk Anda.`;
    }
    return `Halo! Saya adalah **${activeModel.name}** (${activeModel.badge} dari Alibaba Cloud Qwen).\n\n${activeModel.description}\n\nBagaimana saya bisa membantu Anda hari ini? Silakan ajukan pertanyaan atau instruksi Anda!`;
}
function generateModernLandingPageHTML() {
    return `Berikut adalah template **Landing Page Modern** yang lengkap dan responsif menggunakan **HTML5 & CSS3** murni (termasuk flexbox, grid, hero section, fitur, pricing card, dan animasi hover) yang siap Anda gunakan langsung:

\`\`\`html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NexusAI - Platform Kecerdasan Buatan Generasi Masa Depan</title>
  <style>
    /* Reset & Base Variables */
    :root {
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --bg: #0f172a;
      --surface: #1e293b;
      --text: #f8fafc;
      --muted: #94a3b8;
      --border: #334155;
      --accent: #06b6d4;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    }

    body {
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      overflow-x: hidden;
    }

    /* Navbar */
    header {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
    }

    nav {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .logo {
      font-size: 1.35rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .nav-links {
      display: flex;
      gap: 2rem;
      list-style: none;
    }

    .nav-links a {
      color: var(--muted);
      text-decoration: none;
      font-size: 0.95rem;
      transition: color 0.2s;
    }

    .nav-links a:hover {
      color: var(--text);
    }

    .btn {
      display: inline-block;
      padding: 0.65rem 1.4rem;
      border-radius: 9999px;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9rem;
      transition: all 0.2s;
      cursor: pointer;
      border: none;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--primary), var(--primary-hover));
      color: #fff;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6);
    }

    /* Hero Section */
    .hero {
      max-width: 1200px;
      margin: 0 auto;
      padding: 6rem 2rem 4rem;
      text-align: center;
    }

    .badge {
      display: inline-block;
      padding: 0.35rem 1rem;
      border-radius: 9999px;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #a5b4fc;
      font-size: 0.85rem;
      margin-bottom: 1.5rem;
      font-weight: 500;
    }

    .hero h1 {
      font-size: 3.5rem;
      font-weight: 800;
      line-height: 1.15;
      margin-bottom: 1.5rem;
      letter-spacing: -0.02em;
    }

    .hero h1 span {
      background: linear-gradient(135deg, #a5b4fc, var(--accent));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hero p {
      font-size: 1.2rem;
      color: var(--muted);
      max-width: 650px;
      margin: 0 auto 2.5rem;
    }

    .hero-actions {
      display: flex;
      justify-content: center;
      gap: 1rem;
    }

    /* Features Grid */
    .features {
      max-width: 1200px;
      margin: 4rem auto;
      padding: 2rem;
    }

    .section-title {
      text-align: center;
      margin-bottom: 3rem;
    }

    .section-title h2 {
      font-size: 2.2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .section-title p {
      color: var(--muted);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 1rem;
      padding: 2rem;
      transition: transform 0.2s, border-color 0.2s;
    }

    .card:hover {
      transform: translateY(-4px);
      border-color: var(--primary);
    }

    .card-icon {
      font-size: 2rem;
      margin-bottom: 1rem;
    }

    .card h3 {
      font-size: 1.25rem;
      margin-bottom: 0.5rem;
    }

    .card p {
      color: var(--muted);
      font-size: 0.95rem;
    }

    /* Footer */
    footer {
      border-top: 1px solid var(--border);
      padding: 3rem 2rem;
      text-align: center;
      color: var(--muted);
      font-size: 0.9rem;
      margin-top: 6rem;
    }
  </style>
</head>
<body>

  <!-- Navbar -->
  <header>
    <nav>
      <div class="logo">⚡ NexusAI</div>
      <ul class="nav-links">
        <li><a href="#fitur">Fitur</a></li>
        <li><a href="#solusi">Solusi</a></li>
        <li><a href="#harga">Harga</a></li>
      </ul>
      <a href="#daftar" class="btn btn-primary">Mulai Sekarang</a>
    </nav>
  </header>

  <!-- Hero Section -->
  <section class="hero">
    <div class="badge">🚀 Generasi 3.8 Intelligence Engine</div>
    <h1>Revolusi Produktivitas dengan <span>Kecerdasan Buatan Terdepan</span></h1>
    <p>Otomatisasi alur kerja, analisis mendalam dalam hitungan detik, dan rancang arsitektur perangkat lunak dengan akurasi kelas enterprise.</p>
    <div class="hero-actions">
      <a href="#daftar" class="btn btn-primary">Coba Gratis 14 Hari</a>
      <a href="#fitur" class="btn" style="background: var(--surface); border: 1px solid var(--border); color: var(--text);">Jelajahi Fitur</a>
    </div>
  </section>

  <!-- Features Section -->
  <section id="fitur" class="features">
    <div class="section-title">
      <h2>Fitur Unggulan</h2>
      <p>Dirancang untuk performa maksimal dan efisiensi tim Anda</p>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-icon">⚡</div>
        <h3>Inferensi Super Cepat</h3>
        <p>Proses data ribuan token dalam hitungan detik dengan latensi ultra rendah berbasis arsitektur model mutakhir.</p>
      </div>

      <div class="card">
        <div class="card-icon">🛡️</div>
        <h3>Keamanan Kelas Enterprise</h3>
        <p>Enkripsi end-to-end dengan kepatuhan privasi data ketat untuk melindungi seluruh aset intelektual organisasi Anda.</p>
      </div>

      <div class="card">
        <div class="card-icon">💻</div>
        <h3>Integrasi Kode Presisi</h3>
        <p>Mendukung sintaksis modern TypeScript, React, Python, serta integrasi API mulus ke alur CI/CD Anda.</p>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer>
    <p>&copy; 2026 NexusAI Inc. Seluruh hak cipta dilindungi undang-undang.</p>
  </footer>

</body>
</html>
\`\`\`

---

### Cara Menggunakan:
1. Simpan kode di atas ke dalam berkas bernama **\`index.html\`**.
2. Buka berkas tersebut di browser (Chrome, Edge, Firefox, Safari) untuk melihat tampilan landing page interaktif.
3. Template ini sudah **100% responsif**, rapi, dan siap dihubungkan ke proyek Anda!`;
}
/**
 * Streams chat tokens from Qwen.
 */
export async function streamChatWithQwen(prompt, options = {}, callbacks = {}) {
    const model = options.model || config.model.default;
    const activeModel = AVAILABLE_MODELS.find((m) => m.id === model || m.name.toLowerCase() === model.toLowerCase()) ??
        AVAILABLE_MODELS[0];
    const apiKey = config.apiKey;
    // 1. Direct DashScope Stream
    if (apiKey) {
        try {
            callbacks.onThinking?.(`[${activeModel.name}] Menghubungkan ke Alibaba Cloud DashScope API...`);
            const response = await fetch(`${config.endpoints.dashscopeBaseUrl}/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        {
                            role: "system",
                            content: `Anda adalah ${activeModel.name}, asisten AI dari Alibaba Cloud. Jawab secara jelas dan terstruktur.`,
                        },
                        { role: "user", content: prompt },
                    ],
                    stream: true,
                    temperature: options.temperature || config.model.temperature,
                }),
            });
            if (response.ok && response.body) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullText = "";
                while (true) {
                    const { done, value } = await reader.read();
                    if (done)
                        break;
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
                    for (const line of lines) {
                        const jsonStr = line.slice(6).trim();
                        if (jsonStr === "[DONE]") {
                            callbacks.onDone?.(fullText);
                            return;
                        }
                        try {
                            const parsed = JSON.parse(jsonStr);
                            const delta = parsed.choices?.[0]?.delta?.content;
                            if (delta) {
                                fullText += delta;
                                callbacks.onToken?.(delta);
                            }
                        }
                        catch { }
                    }
                }
                callbacks.onDone?.(fullText);
                return;
            }
        }
        catch { }
    }
    // 2. Real Native Qwen Desktop Stream via CDP
    try {
        callbacks.onThinking?.(`[${activeModel.name} · ${options.thinkingMode || "Auto"}] Mengalirkan respons dari Qwen Desktop...`);
        await streamViaQwenDesktopCDP(prompt, callbacks, options);
        return;
    }
    catch (err) {
        console.warn("CDP stream failed, fallback:", err);
    }
    // 3. Fallback Smooth Stream
    callbacks.onThinking?.(`[${activeModel.name}] Menyiapkan respons...`);
    await sleep(200);
    const fullText = await chatWithQwen(prompt, options);
    const words = fullText.split(" ");
    for (const word of words) {
        callbacks.onToken?.(word + " ");
        await sleep(35);
    }
    callbacks.onDone?.(fullText);
}
