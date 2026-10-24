# English Learn · 分级英语学习

一个免费、公开的英语学习网站，按 CEFR 把内容分成 A1 / A2 / B1 / B2 / C1 / C2 六级。

**在线访问：** https://shizhongzhou.github.io/english-learn/

## 每一级包含

- **全部分级词汇**：带音标和中文释义，点击发音，可标记“已掌握”（进度保存在浏览器本地）。可切换“本级新词 / 累计词汇”。
  累计词汇量：A1 1,060 · A2 2,299 · B1 4,437 · B2 6,849 · C1 10,000 · C2 16,000
- **情景对话**：男女声分角色朗读，逐句中文翻译。
- **听力练习**：先盲听做理解题，再对照原文与译文逐句复听。
- **近期新闻**：根据公开报道按该等级难度改写，慢速 0.7× / 正常 1× / 倍速 1.5× 朗读，逐句中英对照，点击任意单词查看释义并发音。

## 技术说明

纯静态网站（HTML + CSS + JS，无需构建），通过 GitHub Pages 发布。

- 单词发音：有道词典在线发音（美式/英式可选），失败时自动改用浏览器语音。
- 句子朗读：浏览器自带英语语音（Web Speech API），可在“发音设置”中切换为在线发音。

```
index.html
assets/app.js        # 路由、播放器、各页面
assets/style.css
data/vocab/A1.json … C2.json     # {w 单词, p 音标, t 中文释义, pos 词性}
data/content/A1.json … C2.json   # dialogues / listening / news
```

### 更新新闻

编辑 `data/content/<等级>.json` 中的 `news` 数组，每条新闻格式：

```json
{ "id": "b1-n4", "title": "...", "titleZh": "...", "date": "2026-11-01", "category": "科技",
  "source": { "name": "...", "url": "https://..." },
  "sentences": [ { "en": "English sentence.", "zh": "中文翻译。" } ] }
```

## 数据来源与许可

- 分级词表：[CEFR-J Wordlist v1.5](https://github.com/openlanguageprofiles/olp-en-cefrj)（© 东京外国语大学 投野研究室，可免费用于研究与商业用途，需注明出处）；[Octanove Vocabulary Profile C1/C2](https://github.com/openlanguageprofiles/olp-en-cefrj)（CC BY-SA 4.0）。
- C1/C2 扩展词、音标与中文释义：[ECDICT](https://github.com/skywind3000/ECDICT)（MIT）。C1/C2 扩展部分按词频与常见考试词表（四六级、雅思、托福等）补充。
- 新闻为依据公开报道改写的学习材料，每篇附原始报道链接。
