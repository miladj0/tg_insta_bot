import express from "express";
import { WebSocketServer } from "ws";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import puppeteer from "puppeteer";
import { getStream } from "puppeteer-stream";
import { RTCPeerConnection, RTCSessionDescription } from "wrtc";

puppeteerExtra.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static("public"));

const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const wss = new WebSocketServer({ server });

let browser, page;
(async () => {
  browser = await puppeteerExtra.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  await page.goto("https://www.instagram.com", { waitUntil: "networkidle2" });
  console.log("Puppeteer ready on Instagram");
})();

wss.on("connection", async (ws) => {
  console.log("Client connected");

  const pc = new RTCPeerConnection();
  const stream = await getStream(page, { audio: false, video: true });
  stream.getTracks().forEach(track => pc.addTrack(track, stream));

  pc.onicecandidate = (event) => {
    if (event.candidate) ws.send(JSON.stringify({ type: "ice", candidate: event.candidate }));
  };

  ws.on("message", async (msg) => {
    const data = JSON.parse(msg.toString());
    if (data.type === "offer") {
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.send(JSON.stringify({ type: "answer", answer }));
    } else if (data.type === "ice" && data.candidate) {
      await pc.addIceCandidate(data.candidate);
    } else if (data.type === "click") {
      await page.mouse.click(data.x, data.y, { delay: 50 });
    } else if (data.type === "type") {
      await page.keyboard.type(data.text, { delay: 50 });
    } else if (data.type === "scroll") {
      await page.evaluate((s) => window.scrollBy(0, s), data.deltaY);
    } else if (data.type === "goto") {
      await page.goto(data.url, { waitUntil: "networkidle2" });
    }
  });

  ws.on("close", () => console.log("Client disconnected"));
});
