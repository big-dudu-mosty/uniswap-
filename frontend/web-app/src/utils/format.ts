/**
 * 格式化工具函数
 */

/**
 * 格式化数字（添加千分位）
 */
export const formatNumber = (num: string | number, decimals: number = 4): string => {
  const value = typeof num === 'string' ? parseFloat(num) : num

  if (isNaN(value)) return '0'

  // 如果数字为 0，直接返回
  if (value === 0) return '0'

  // 对于非常小的数字，显示更多小数位而不是科学计数法
  if (value > 0 && value < 0.0001) {
    // 找到第一个非零数字，保留足够的小数位
    const str = value.toFixed(18)
    const match = str.match(/^0\.(0*)([1-9]\d{0,5})/)
    if (match) {
      return `0.${match[1]}${match[2]}`
    }
    return value.toFixed(decimals)
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
}

/**
 * 解析代币数量（转换为最小单位）
 */
export const parseTokenAmount = (
  amount: string,
  decimals: number = 18
): string => {
  try {
    const [whole = '0', decimal = '0'] = amount.split('.')
    const paddedDecimal = decimal.padEnd(decimals, '0').slice(0, decimals)
    const value = BigInt(whole + paddedDecimal)
    return value.toString()
  } catch {
    return '0'
  }
}

/**
 * 格式化时间戳（北京时间 UTC+8）
 * 支持 Unix 时间戳（秒/毫秒）和 ISO 日期字符串
 */
export const formatTimestamp = (timestamp: string | number): string => {
  try {
    let date: Date

    if (typeof timestamp === 'string') {
      // 检查是否为 ISO 日期字符串（包含 T 或 -）
      if (timestamp.includes('T') || timestamp.includes('-')) {
        date = new Date(timestamp)
      } else {
        // 尝试作为 Unix 时间戳处理
        const ts = parseInt(timestamp)
        // 如果是毫秒级时间戳（大于 10^12）
        date = ts > 1e12 ? new Date(ts) : new Date(ts * 1000)
      }
    } else {
      // 数字类型，判断是秒还是毫秒
      date = timestamp > 1e12 ? new Date(timestamp) : new Date(timestamp * 1000)
    }

    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return '-'
    }

    return date.toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  } catch {
    return '-'
  }
}

/**
 * 检查是否为有效的数字输入
 */
export const isValidNumber = (value: string): boolean => {
  if (!value) return false
  return /^\d*\.?\d*$/.test(value) && !isNaN(parseFloat(value))
}

