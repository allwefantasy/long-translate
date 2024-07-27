export const formatTime = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return (
    [year, month, day].map(formatNumber).join('/') +
    ' ' +
    [hour, minute, second].map(formatNumber).join(':')
  )
}

const formatNumber = (n: number) => {
  const s = n.toString()
  return s[1] ? s : '0' + s
}

export function promisify<T>(api: (...args: any[]) => void): (...args: any[]) => Promise<T> {
  return (...args: any[]): Promise<T> => {
    return new Promise((resolve, reject) => {
      api(...args, (res: T | { errMsg: string }) => {
        if ('errMsg' in res && res.errMsg.indexOf('fail') !== -1) {
          reject(new Error(res.errMsg));
        } else {
          resolve(res as T);
        }
      });
    });
  };
}
