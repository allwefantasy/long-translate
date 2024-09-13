
# 📚 长文翻译小程序使用文档

全球首款已经上线的基于[auto-coder.chat](https://uelng8wukz.feishu.cn/wiki/NhPNwSRcWimKFIkQINIckloBncI?fromScene=spaceOverview&open_tab_from=wiki_home)纯AI打造的微信小程序应用： 长文翻译。

这个小程序可以帮助您轻松翻译长篇文档，支持多种文件格式和语言。

![](./ai_images/logo.jpg)

---

## 📋 目录

1. [功能概览](#功能概览)
2. [使用步骤](#使用步骤)
3. [支持的文件格式](#支持的文件格式)
4. [支持的语言](#支持的语言)
5. [注意事项](#注意事项)
6. [常见问题](#常见问题)

---

## 🌟 功能概览

- 📄 支持多种文件格式的翻译
- 🌍 多语言翻译支持
- 💾 翻译结果下载
- 🚀 高效的长文本处理

---

## 🔧 使用步骤

1. 📲 打开小程序 （搜索： 长文翻译 ）
2. 📁 点击"选择文件"按钮，选择需要翻译的文件
3. 🌐 从下拉菜单中选择目标语言
4. 🚀 点击"开始翻译"按钮
5. ⏳ 等待翻译完成
6. 💾 点击"下载结果"保存翻译内容

---

## 📑 支持的文件格式

- 📄 TXT 文本文件
- 📊 PDF 文档
- 📝 Word 文档 (.docx)

---

## 🌐 支持的语言

- 🇺🇸 英语
- 🇨🇳 中文
- 🇪🇸 西班牙语
- 🇫🇷 法语
- 🇩🇪 德语
- 🇯🇵 日语
- 🇰🇷 韩语
- 🇷🇺 俄语
- 🇸🇦 阿拉伯语
- 🇵🇹 葡萄牙语
- 🇮🇹 意大利语

---

## ⚠️ 注意事项

- 📊 大文件可能需要较长的处理时间，请耐心等待
- 📶 请确保网络连接稳定，以免影响翻译进度

---

## ❓ 常见问题

**Q: 翻译过程中出现错误怎么办？**
A: 请检查网络连接，然后重新尝试。如果问题持续，可以尝试重新启动小程序。

**Q: 可以翻译图片吗？**
A: 目前不支持图片翻译，仅支持文本形式的文件。

**Q: 翻译结果如何保存？**
A: 点击"下载结果"按钮，可以选择保存到相册或保存为文件。

---
如果您在使用过程中遇到任何问题或有任何建议，欢迎随时反馈。祝您使用愉快！ 😊

---

## 👨‍💻 开发者指南

本节为有兴趣参与项目开发的开发者提供指导。

### 🛠 开发环境设置

1. 克隆项目仓库:
   ```
   git clone https://github.com/your-repo/long-translate.git
   cd long-translate
   ```

2. 安装依赖:
   ```
   npm install
   ```

3. 设置微信开发者工具:
   - 下载并安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
   - 导入项目到开发者工具

### 🏗 项目结构

- `miniprogram/`: 小程序前端代码
  - `pages/`: 页面文件
  - `components/`: 自定义组件
  - `utils/`: 工具函数
- `backend/`: 后端服务代码
  - `src/`: 源代码
    - `app.py`: 主应用文件

### 🔧 开发流程

1. 创建新分支进行开发:
   ```
   git checkout -b feature/your-feature-name
   ```

2. 使用微信小程序开发者工具打开项目，然后新建一个 Terminal，输入 auto-coder.chat, 进行代码修改和测试
  ```
  auto-coder.chat
  ```
  注意，当让你输入项目类型(project_type)时，输入：.js,.ts,.scss,.wxml,.json,.py

3. 推送分支并创建 Pull Request

我和 auto-coder.chat 交互的历史记录在 william_actions 目录里。

### 如何使用 OpenAI o1-preview/o1-mini 迭代

因为目前没有提供API，可以用 auto-coder.chat 的[human as model](https://uelng8wukz.feishu.cn/wiki/IkofwKqAeiPu3Hkz6SMcxriKn6f?fromScene=spaceOverview) 模式，使用网页版大模型来开发。

### 🧪 测试

- 使用微信开发者工具进行本地测试
- 运行后端服务进行 API 测试:
  ```
  cd backend
  pip install -U auto-coder
  python src/app.py
  ```

### 📚 文档

- 请确保为新功能或变更更新相关文档
- 遵循现有的代码风格和注释规范

### 🤝 贡献指南

我们欢迎所有形式的贡献，包括但不限于:

- 新功能开发
- Bug 修复
- 文档改进
- 性能优化

在提交 Pull Request 之前，请确保您的代码符合项目的编码规范并通过了所有测试。

感谢您对长文翻译小程序的贡献！

