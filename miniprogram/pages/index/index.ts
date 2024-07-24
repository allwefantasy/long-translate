// index.ts
Component({
  data: {
    fileName: '',
    translationResult: '',
    languages: [
      { code: 'en', name: '英语' },
      { code: 'zh', name: '中文' },
      { code: 'es', name: '西班牙语' },
      { code: 'fr', name: '法语' },
      { code: 'de', name: '德语' },
      { code: 'ja', name: '日语' },
      { code: 'ko', name: '韩语' },
      { code: 'ru', name: '俄语' },
      { code: 'ar', name: '阿拉伯语' },
      { code: 'pt', name: '葡萄牙语' },
      { code: 'it', name: '意大利语' },
    ],
    languageIndex: 0,
  },
  methods: {
    onLanguageChange(e: any) {
      this.setData({
        languageIndex: e.detail.value
      })
    },
    chooseFile() {
      wx.chooseMessageFile({
        count: 1,
        type: 'file',
        success: (res) => {
          const file = res.tempFiles[0]
          this.setData({
            fileName: file.name
          })
          // 保存文件路径以供后续使用
          this.filePath = file.path
        }
      })
    },
    translateFile() {
      if (!this.filePath) {
        wx.showToast({
          title: '请先选择文件',
          icon: 'none'
        })
        return
      }
      
      const targetLanguage = this.data.languages[this.data.languageIndex].code
      
      wx.showLoading({
        title: '翻译中...',
      })
      
      // 这里应该调用你的翻译API
      // 以下是模拟API调用的示例，现在包含目标语言
      setTimeout(() => {
        wx.hideLoading()
        this.setData({
          translationResult: `这是翻译成${this.data.languages[this.data.languageIndex].name}的内容。This is the content translated to ${targetLanguage}.`
        })
      }, 2000)
    },
    downloadTranslation() {
      if (!this.data.translationResult) {
        wx.showToast({
          title: '没有可下载的内容',
          icon: 'none'
        })
        return
      }
      
      wx.showActionSheet({
        itemList: ['保存到相册', '保存到文件'],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.saveToAlbum()
          } else if (res.tapIndex === 1) {
            this.saveToFile()
          }
        },
        fail: (res) => {
          console.log(res.errMsg)
        }
      })
    },

    saveToAlbum() {
      const ctx = wx.createCanvasContext('translationCanvas')
      ctx.setFillStyle('#ffffff')
      ctx.fillRect(0, 0, 300, 450)
      ctx.setFontSize(14)
      ctx.setFillStyle('#000000')
      ctx.fillText(this.data.translationResult, 10, 30, 280)
      ctx.draw(false, () => {
        wx.canvasToTempFilePath({
          canvasId: 'translationCanvas',
          success: (res) => {
            wx.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              success: () => {
                wx.showToast({
                  title: '已保存到相册',
                  icon: 'success'
                })
              },
              fail: (err) => {
                console.error('保存到相册失败', err)
                wx.showToast({
                  title: '保存失败',
                  icon: 'none'
                })
              }
            })
          },
          fail: (err) => {
            console.error('生成图片失败', err)
          }
        })
      })
    },

    saveToFile() {
      const fileName = `translation_${new Date().getTime()}.txt`
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`
      
      wx.getFileSystemManager().writeFile({
        filePath: filePath,
        data: this.data.translationResult,
        encoding: 'utf8',
        success: () => {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          })
          console.log('文件已保存到', filePath)                    
        },
        fail: (err) => {
          console.error('写入文件失败', err)
          wx.showToast({
            title: '保存失败',
            icon: 'none'
          })
        }
      })
    },
    translateFile() {
      if (!this.filePath) {
        wx.showToast({
          title: '请先选择文件',
          icon: 'none'
        })
        return
      }
      
      const targetLanguage = this.data.languages[this.data.languageIndex].code
      
      wx.showLoading({
        title: '翻译中...',
      })
      
      // 读取文件内容
      wx.getFileSystemManager().readFile({
        filePath: this.filePath,
        encoding: 'utf-8',
        success: (res) => {
          // 调用翻译API
          wx.request({
            url: 'https://route.api.mlsql.tech/v1/llm/translate',
            method: 'POST',
            header: {
              'content-type': 'application/json',
              'x-user-token': 'your-user-token' 
            },
            data: {
              text: res.data,
              language: targetLanguage
            },
            success: (response: any) => {
              wx.hideLoading()
              if (response.statusCode === 200) {
                this.setData({
                  translationResult: response.data.translation
                })
              } else {
                wx.showToast({
                  title: '翻译失败',
                  icon: 'none'
                })
              }
            },
            fail: (err) => {
              wx.hideLoading()
              console.error('翻译请求失败', err)
              wx.showToast({
                title: '翻译失败',
                icon: 'none'
              })
            }
          })
        },
        fail: (err) => {
          wx.hideLoading()
          console.error('读取文件失败', err)
          wx.showToast({
            title: '读取文件失败',
            icon: 'none'
          })
        }
      })
    }
  }
})
