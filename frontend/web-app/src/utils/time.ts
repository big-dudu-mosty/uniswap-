/**
 * 时间格式化工具 - 统一使用北京时间 (UTC+8)
 */

/**
 * 将 UTC 时间字符串转换为北京时间 Date 对象
 */
export const parseToBeijingDate = (dateString: string): Date => {
  if (!dateString) return new Date()

  // 处理各种格式
  let normalizedString = dateString

  // 如果没有 T 分隔符，添加它
  if (!dateString.includes('T') && dateString.includes(' ')) {
    normalizedString = dateString.replace(' ', 'T')
  }

  // 如果没有时区标识，假设是 UTC，添加 'Z'
  if (!normalizedString.endsWith('Z') && !normalizedString.includes('+')) {
    normalizedString = normalizedString + 'Z'
  }

  return new Date(normalizedString)
}

/**
 * 格式化为北京时间完整格式
 * 例如: "2026/01/19 10:53:47"
 */
export const formatBeijingTime = (dateString: string): string => {
  const date = parseToBeijingDate(dateString)

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
}

/**
 * 格式化为北京时间日期格式
 * 例如: "2026/01/19"
 */
export const formatBeijingDate = (dateString: string): string => {
  const date = parseToBeijingDate(dateString)

  return date.toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * 格式化为相对时间
 * 例如: "刚刚", "5分钟前", "2小时前", "3天前"
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = parseToBeijingDate(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 0) return '刚刚'
  if (diffSec < 60) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  if (diffHour < 24) return `${diffHour}小时前`
  if (diffDay < 7) return `${diffDay}天前`
  if (diffDay < 30) return `${diffDay}天前`

  return date.toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * 格式化为简短时间格式
 * 例如: "10:53" 或 "01/19"
 */
export const formatShortTime = (dateString: string): string => {
  const date = parseToBeijingDate(dateString)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return date.toLocaleTimeString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  return date.toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit'
  })
}
