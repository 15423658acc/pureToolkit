/**
 * 数据备份：JSON 导出/导入
 * ------------------------------------------------------------
 * 由于 IndexedDB 数据在用户清浏览器缓存时会被清掉，
 * 建议提供"一键导出 JSON 备份"和"导入恢复"。
 */
import {
  db,
  type Birthday,
  type ExpiryCustomTag,
  type ExpiryItem,
  type MediaItem,
  type PomodoroSession,
  type PomodoroTodo,
  type ScheduleCompletion,
  type ScheduleItem,
  type ScheduleTagDef,
  type WheelHistory,
  type WheelTemplate
} from './db'

export interface BackupPayload {
  version: 1
  exportedAt: number
  data: {
    wheelTemplates: WheelTemplate[]
    wheelHistory: WheelHistory[]
    expiryItems: ExpiryItem[]
    expiryCustomTags: ExpiryCustomTag[]
    mediaItems: MediaItem[]
    scheduleItems: ScheduleItem[]
    scheduleCompletions: ScheduleCompletion[]
    scheduleTags: ScheduleTagDef[]
    pomodoroTodos: PomodoroTodo[]
    pomodoroSessions: PomodoroSession[]
    birthdays: Birthday[]
  }
}

export async function exportAllData(): Promise<BackupPayload> {
  const [
    wheelTemplates,
    wheelHistory,
    expiryItems,
    expiryCustomTags,
    mediaItems,
    scheduleItems,
    scheduleCompletions,
    scheduleTags,
    pomodoroTodos,
    pomodoroSessions,
    birthdays
  ] = await Promise.all([
    db.wheelTemplates.toArray(),
    db.wheelHistory.toArray(),
    db.expiryItems.toArray(),
    db.expiryCustomTags.toArray(),
    db.mediaItems.toArray(),
    db.scheduleItems.toArray(),
    db.scheduleCompletions.toArray(),
    db.scheduleTags.toArray(),
    db.pomodoroTodos.toArray(),
    db.pomodoroSessions.toArray(),
    db.birthdays.toArray()
  ])
  return {
    version: 1,
    exportedAt: Date.now(),
    data: {
      wheelTemplates,
      wheelHistory,
      expiryItems,
      expiryCustomTags,
      mediaItems,
      scheduleItems,
      scheduleCompletions,
      scheduleTags,
      pomodoroTodos,
      pomodoroSessions,
      birthdays
    }
  }
}

export async function downloadBackup(): Promise<void> {
  const payload = await exportAllData()
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `puretoolkit-backup-${date}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function importFromJSON(file: File): Promise<{ ok: boolean; message: string }> {
  try {
    const text = await file.text()
    const payload = JSON.parse(text) as Partial<BackupPayload>
    if (payload.version !== 1 || !payload.data) {
      return { ok: false, message: '备份文件格式不正确' }
    }
    const d: BackupPayload['data'] = payload.data
    await db.transaction('rw', [
      db.wheelTemplates, db.wheelHistory, db.expiryItems, db.expiryCustomTags,
      db.mediaItems, db.scheduleItems, db.scheduleCompletions, db.scheduleTags,
      db.pomodoroTodos, db.pomodoroSessions, db.birthdays
    ], async () => {
      await Promise.all([
        db.wheelTemplates.bulkPut(d.wheelTemplates ?? []),
        db.wheelHistory.bulkPut(d.wheelHistory ?? []),
        db.expiryItems.bulkPut(d.expiryItems ?? []),
        db.expiryCustomTags.bulkPut(d.expiryCustomTags ?? []),
        db.mediaItems.bulkPut(d.mediaItems ?? []),
        db.scheduleItems.bulkPut(d.scheduleItems ?? []),
        db.scheduleCompletions.bulkPut(d.scheduleCompletions ?? []),
        db.scheduleTags.bulkPut(d.scheduleTags ?? []),
        db.pomodoroTodos.bulkPut(d.pomodoroTodos ?? []),
        db.pomodoroSessions.bulkPut(d.pomodoroSessions ?? []),
        db.birthdays.bulkPut(d.birthdays ?? [])
      ])
    })
    const count =
      (d.wheelTemplates?.length ?? 0) +
      (d.wheelHistory?.length ?? 0) +
      (d.expiryItems?.length ?? 0) +
      (d.expiryCustomTags?.length ?? 0) +
      (d.mediaItems?.length ?? 0) +
      (d.scheduleItems?.length ?? 0) +
      (d.scheduleCompletions?.length ?? 0) +
      (d.scheduleTags?.length ?? 0) +
      (d.pomodoroTodos?.length ?? 0) +
      (d.pomodoroSessions?.length ?? 0) +
      (d.birthdays?.length ?? 0)
    return { ok: true, message: `已恢复 ${count} 条记录` }
  } catch (e) {
    return { ok: false, message: '导入失败：' + (e as Error).message }
  }
}
