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
    version: '1.0.2', // 添加版本号
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
      const tempFilePath = `${wx.env.USER_DATA_PATH}/${fileName}`
      
      // 先将内容写入临时文件
      wx.getFileSystemManager().writeFile({
        filePath: tempFilePath,
        data: this.data.translationResult,
        encoding: 'utf8',
        success: () => {
          console.log(tempFilePath)
          wx.showModal({
                title: `文件已保存`,
                content: '文件已保存到本地。您想要分享这个文件吗？',
                confirmText: '分享',
                cancelText: '关闭',
                success: (res) => {
                  if (res.confirm) {
                    wx.shareFileMessage({
                      filePath: tempFilePath,
                      success: () => {
                        console.log('文件分享成功')
                      },
                      fail: (err) => {
                        console.error('文件分享失败', err)
                      }
                    })
                  }
                }
              })
        },
        fail: (err) => {
          console.error('写入临时文件失败', err)
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
      
      const targetLanguage = this.data.languages[this.data.languageIndex].name
      
      wx.showLoading({
        title: '翻译中...',
      })
      
      // 获取文件扩展名
      const fileExtension = this.filePath.split('.').pop()?.toLowerCase()
      
      // 根据文件类型选择不同的读取方法
      if (fileExtension === 'txt') {
        this.readTextFile(targetLanguage)
      } else if (fileExtension === 'pdf' || fileExtension === 'docx') {
        this.readBinaryFile(targetLanguage)
      } else {
        wx.hideLoading()
        wx.showToast({
          title: '只支持pdf/word/txt文件',
          icon: 'none'
        })
      }
    },

    readTextFile(targetLanguage: string) {
      wx.getFileSystemManager().readFile({
        filePath: this.filePath,
        encoding: 'utf-8',
        success: (res) => {
          this.callTranslateAPI(res.data, targetLanguage)
        },
        fail: (err) => {
          this.handleFileReadError(err)
        }
      })
    },

    readBinaryFile(targetLanguage: string) {
      wx.getFileSystemManager().readFile({
        filePath: this.filePath,
        success: (res) => {
          const base64 = wx.arrayBufferToBase64(res.data)
          const fileType = this.filePath.split('.').pop()
          const dataUrl = `data:application/${fileType};base64,${base64}`
          this.callTranslateAPI(dataUrl, targetLanguage)
        },
        fail: (err) => {
          this.handleFileReadError(err)
        }
      })
    },

    callTranslateAPI(data: string, targetLanguage: string) {
      wx.request({
        url: 'https://long-translate.mlsql.tech:8998/v1/llm/translate',
        method: 'POST',
        header: {
          'content-type': 'application/json',
          'x-user-token': 'long-translate' 
        },
        data: {
          text: data,
          language: targetLanguage
        },
        success: (response: any) => {
          if (response.statusCode === 200) {
            const md5Hash = response.data.translation          
            this.pollTranslationResult(md5Hash)
          } else {            
            this.handleTranslationError(response, 'error')
          }
        },
        fail: (error:any) => {          
          this.handleTranslationError(error, 'fail')
        }
      })
    },

    pollTranslationResult(md5Hash: string, maxRetries = 60, delay = 15000) {
      let retries = 0
      const poll = () => {
        if (retries >= maxRetries) {
          wx.hideLoading()
          wx.showToast({
            title: '翻译超时',
            icon: 'none'
          })
          console.error(`翻译失败：超过最大重试次数 ${maxRetries}`)
          return
        }

        wx.request({
          url: 'https://long-translate.mlsql.tech:8998/v1/llm/translate/result',
          method: 'POST',
          header: {
            'content-type': 'application/json',
            'x-user-token': 'long-translate'
          },
          data: {
            md5: md5Hash
          },
          success: (response: any) => {
            if (response.statusCode === 200) {
              wx.hideLoading()
              this.setData({
                translationResult: response.data.translation
              })
              console.log('翻译成功完成')
            } else if (response.statusCode === 404) {
              console.log(`翻译进行中... 重试次数: ${retries + 1}/${maxRetries}`)
              retries++
              setTimeout(poll, delay)
            } else {
              console.error(`拉取翻译结果请求失败。状态码: ${response.statusCode}, 错误信息: ${JSON.stringify(response.data)}`)
              retries++
              setTimeout(poll, delay)
            }
          },
          fail: (err) => {
            console.error(`拉取翻译结果请求失败。错误信息: ${JSON.stringify(err)}`)
            retries++
            setTimeout(poll, delay)
          }
        })
      }

      poll()
    },

    handleFileReadError(err: any) {
      wx.hideLoading()
      console.error('读取文件失败', err)
      wx.showToast({
        title: '读取文件失败',
        icon: 'none'
      })
    },

    handleTranslationError(response: any, type: 'error' | 'fail') {
      wx.hideLoading()
      if (type === 'error') {
        console.error('翻译请求失败', {
          statusCode: response.statusCode,
          errMsg: response.errMsg,
          data: response.data
        })
      } else {
        console.error('翻译请求失败', response)
      }
      wx.showToast({
        title: '翻译失败',
        icon: 'none'
      })
    }
  }
})
