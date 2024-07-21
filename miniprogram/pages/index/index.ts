// index.ts
Component({
  data: {
    fileName: '',
    translationResult: '',
  },
  methods: {
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
      
      wx.showLoading({
        title: '翻译中...',
      })
      
      // 这里应该调用你的翻译API
      // 以下是模拟API调用的示例
      setTimeout(() => {
        wx.hideLoading()
        this.setData({
          translationResult: '这是翻译后的内容。This is the translated content.'
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
      
      const fs = wx.getFileSystemManager()
      const fileName = `translation_${new Date().getTime()}.txt`
      
      fs.writeFile({
        filePath: `${wx.env.USER_DATA_PATH}/${fileName}`,
        data: this.data.translationResult,
        encoding: 'utf8',
        success: () => {
          wx.saveFile({
            tempFilePath: `${wx.env.USER_DATA_PATH}/${fileName}`,
            success: (res) => {
              wx.showToast({
                title: '下载成功',
                icon: 'success'
              })
            },
            fail: (err) => {
              console.error('保存文件失败', err)
              wx.showToast({
                title: '下载失败',
                icon: 'none'
              })
            }
          })
        },
        fail: (err) => {
          console.error('写入文件失败', err)
          wx.showToast({
            title: '下载失败',
            icon: 'none'
          })
        }
      })
    }
  }
})
